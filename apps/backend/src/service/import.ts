import { UniqueConstraintError } from "sequelize";
import { PIPELINE_LIMITS, LATEST_UTC_OFFSET_MS } from "../constant/pipeline";
import { ERROR_CODES } from "../constant/error";
import { StageType } from "../constant/stage";
import { ImportInterface } from "../model/import";
import { ImportRepoInterface } from "../repo/import";
import { withTransaction } from "../repo/transaction";
import { analysePipeline, filterQueue, QueueFilter } from "./pipeline-analysis";
import { parsePipelineCsv } from "./pipeline-csv";
import { dayNumberOf, parseIsoDate, toIsoDate } from "../utils/dates";
import {
    PipelineAnalysis,
    PipelineCounts,
    Bottleneck,
    Page,
    ParsedPipeline,
    QueueItem,
    RowError,
} from "./pipeline-types";
import { BadRequestException } from "../web/exception/bad-request-exception";
import { NotFoundException } from "../web/exception/not-found-exception";
import { UnprocessableEntityException } from "../web/exception/unprocessable-entity-exception";
import { sha256Hex } from "../utils/utility";
import { toPipelineRecord, toStoredRecord } from "../repo/stored-record";
import { ConfigServiceInterface } from "./config";

export interface ImportSummary {
    id: number;
    fileName: string;
    fileSize: number;
    recordCount: number;
    createdAt: Date;
}

export interface ReportQuery extends QueueFilter {
    referenceDate?: string;
}

export interface PipelineQuery extends ReportQuery {
    page: number;
    pageSize: number;
}

export interface PipelineView {
    import: ImportSummary;
    referenceDate: string;
    stagesVersion: number;
    counts: PipelineCounts;
    bottlenecks: Bottleneck[];
    stageThresholds: { name: string; thresholdDays: number; stalled: number }[];
    filterOptions: { stages: string[]; recruiters: string[] };
    queue: Page<QueueItem>;
}

export interface UploadResult extends PipelineView {
    alreadyImported: boolean;
}

export interface RowErrorsView extends Page<RowError> {
    import: ImportSummary;
    referenceDate: string;
}

export interface ImportList {
    data: ImportSummary[];
    offset: number;
    limit: number;
    total: number;
}

export interface AnalysedImport {
    summary: ImportSummary;
    analysis: PipelineAnalysis;
}

export interface ImportServiceInterface {
    upload(file: { fileName: string; bytes: Buffer }, query: PipelineQuery): Promise<UploadResult>;
    getPipeline(id: number, query: PipelineQuery): Promise<PipelineView>;
    getRowErrors(id: number, query: PipelineQuery): Promise<RowErrorsView>;
    analyse(id: number, referenceDate?: string): Promise<AnalysedImport>;
    list(offset: number, limit: number): Promise<ImportList>;
    remove(id: number): Promise<boolean>;
}

const toSummary = (found: ImportInterface): ImportSummary => ({
    id: found.id as number,
    fileName: found.fileName,
    fileSize: found.fileSize,
    recordCount: found.recordCount,
    createdAt: found.createdAt as Date,
});

const paginate = <T>(items: T[], page: number, pageSize: number): T[] =>
    items.slice((page - 1) * pageSize, page * pageSize);

export class ImportService implements ImportServiceInterface {
    constructor(
        private importRepo: ImportRepoInterface,
        private configService: ConfigServiceInterface,
        private now: () => number = Date.now
    ) {}

    async upload(file: { fileName: string; bytes: Buffer }, query: PipelineQuery): Promise<UploadResult> {
        const referenceDate = this.resolveReferenceDate(query.referenceDate);
        const parsed = parsePipelineCsv(file.bytes);
        if (!parsed.ok) {
            throw new UnprocessableEntityException(
                ERROR_CODES[parsed.error.code as keyof typeof ERROR_CODES],
                parsed.error.message,
                parsed.error.details
            );
        }

        const details: ImportInterface = {
            fileName: file.fileName.slice(0, PIPELINE_LIMITS.MAX_FILE_NAME_LENGTH),
            fileHash: sha256Hex(file.bytes),
            fileSize: file.bytes.length,
            headerCount: parsed.pipeline.headerCount,
            recordCount: parsed.pipeline.records.length,
        };

        try {
            // Insert, never "check then insert": the unique hash decides, even for two uploads at once.
            const created = await withTransaction(async (transaction) => {
                const saved = await this.importRepo.create(details, transaction);
                const records = parsed.pipeline.records.map((record) => toStoredRecord(record, saved.id as number));
                await this.importRepo.createRecords(records, transaction);
                return saved;
            });
            return {
                alreadyImported: false,
                ...this.buildView(toSummary(created), parsed.pipeline, referenceDate, query),
            };
        } catch (err) {
            if (!(err instanceof UniqueConstraintError)) {
                throw err;
            }
            const existing = (await this.importRepo.findByHash(details.fileHash)) as ImportInterface;
            return {
                alreadyImported: true,
                ...this.buildView(toSummary(existing), parsed.pipeline, referenceDate, query),
            };
        }
    }

    async getPipeline(id: number, query: PipelineQuery): Promise<PipelineView> {
        const referenceDate = this.resolveReferenceDate(query.referenceDate);
        const { found, pipeline } = await this.loadPipeline(id);
        return this.buildView(toSummary(found), pipeline, referenceDate, query);
    }

    async getRowErrors(
        id: number,
        query: { referenceDate?: string; page: number; pageSize: number }
    ): Promise<RowErrorsView> {
        const { summary, analysis } = await this.analyse(id, query.referenceDate);
        return {
            import: summary,
            referenceDate: analysis.referenceDate,
            items: paginate(analysis.rowErrors, query.page, query.pageSize),
            page: query.page,
            pageSize: query.pageSize,
            total: analysis.rowErrors.length,
        };
    }

    async analyse(id: number, referenceDate?: string): Promise<AnalysedImport> {
        const date = this.resolveReferenceDate(referenceDate);
        const { found, pipeline } = await this.loadPipeline(id);
        return {
            summary: toSummary(found),
            analysis: analysePipeline(pipeline, this.configService.getSnapshot().stages, date),
        };
    }

    async list(offset: number, limit: number): Promise<ImportList> {
        const [data, total] = await Promise.all([this.importRepo.list(offset, limit), this.importRepo.count()]);
        return { data: data.map(toSummary), offset, limit, total };
    }

    async remove(id: number): Promise<boolean> {
        const removed = await this.importRepo.delete(id);
        if (removed === 0) {
            throw new NotFoundException(ERROR_CODES.E_NOT_FOUND, "Import not found");
        }
        return true;
    }

    private async loadPipeline(id: number): Promise<{ found: ImportInterface; pipeline: ParsedPipeline }> {
        const found = await this.importRepo.findById(id);
        if (!found) {
            throw new NotFoundException(ERROR_CODES.E_NOT_FOUND, "Import not found");
        }
        const records = await this.importRepo.listRecords(id);
        return { found, pipeline: { headerCount: found.headerCount, records: records.map(toPipelineRecord) } };
    }

    private resolveReferenceDate(value?: string): string {
        if (!value) {
            return toIsoDate(dayNumberOf(this.now()));
        }
        const day = parseIsoDate(value);
        if (day === null) {
            throw new BadRequestException(ERROR_CODES.E_INVALID_DATA, "", [
                "referenceDate must be a real YYYY-MM-DD date",
            ]);
        }
        if (day > dayNumberOf(this.now() + LATEST_UTC_OFFSET_MS)) {
            throw new BadRequestException(ERROR_CODES.E_INVALID_DATA, "", ["referenceDate cannot be in the future"]);
        }
        return value;
    }

    private buildView(
        summary: ImportSummary,
        pipeline: ParsedPipeline,
        referenceDate: string,
        query: PipelineQuery
    ): PipelineView {
        const { stages, stagesVersion } = this.configService.getSnapshot();
        const analysis = analysePipeline(pipeline, stages, referenceDate);

        const filtered = filterQueue(analysis.queue, query);

        return {
            import: summary,
            referenceDate: analysis.referenceDate,
            stagesVersion,
            counts: analysis.counts,
            bottlenecks: analysis.bottlenecks,
            stageThresholds: stages
                .filter((stage) => stage.type === StageType.WATCHED)
                .map((stage) => ({
                    name: stage.name,
                    thresholdDays: stage.thresholdDays as number,
                    stalled: analysis.queue.filter((item) => item.stage === stage.name).length,
                })),
            filterOptions: {
                stages: [...new Set(analysis.queue.map((item) => item.stage))],
                recruiters: [...new Set(analysis.queue.map((item) => item.recruiter))].sort(),
            },
            queue: {
                items: paginate(filtered, query.page, query.pageSize),
                page: query.page,
                pageSize: query.pageSize,
                total: filtered.length,
            },
        };
    }
}

export const newImportService = async (
    importRepo: ImportRepoInterface,
    configService: ConfigServiceInterface
): Promise<ImportService> => {
    return new ImportService(importRepo, configService);
};
