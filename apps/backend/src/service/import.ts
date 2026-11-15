import { UniqueConstraintError } from "sequelize";
import { BOARD_LIMITS, LATEST_UTC_OFFSET_MS } from "../constant/board";
import { ERROR_CODES } from "../constant/error";
import { StageType } from "../constant/stage";
import { ImportInterface } from "../model/import";
import { ImportRepoInterface } from "../repo/import";
import { withTransaction } from "../repo/transaction";
import { analyseBoard } from "../rules/analyse-board";
import { parseBoardCsv } from "../rules/csv-reader";
import { filterQueue } from "../rules/queue-filter";
import { dayNumberOf, parseIsoDate, toIsoDate } from "../rules/dates";
import { BoardAnalysis, BoardCounts, Bottleneck, ParsedBoard, QueueItem, RowError } from "../rules/types";
import { BadRequestException } from "../web/exception/bad-request-exception";
import { NotFoundException } from "../web/exception/not-found-exception";
import { UnprocessableEntityException } from "../web/exception/unprocessable-entity-exception";
import { sha256Hex } from "../utils/utility";
import { ConfigServiceInterface } from "./config";

export interface ImportSummary {
    id: number;
    fileName: string;
    fileSize: number;
    recordCount: number;
    createdAt: Date;
}

export interface BoardQuery {
    referenceDate?: string;
    stage?: string;
    recruiter?: string;
    search?: string;
    page: number;
    pageSize: number;
}

export interface BoardView {
    import: ImportSummary;
    referenceDate: string;
    stagesVersion: number;
    counts: BoardCounts;
    bottlenecks: Bottleneck[];
    stageThresholds: { name: string; thresholdDays: number; stalled: number }[];
    filterOptions: { stages: string[]; recruiters: string[] };
    queue: { items: QueueItem[]; page: number; pageSize: number; total: number };
}

export interface UploadResult extends BoardView {
    alreadyImported: boolean;
}

export interface RowErrorsView {
    import: ImportSummary;
    referenceDate: string;
    items: RowError[];
    page: number;
    pageSize: number;
    total: number;
}

export interface ImportServiceInterface {
    upload(file: { fileName: string; bytes: Buffer }, query: BoardQuery): Promise<UploadResult>;
    getBoard(id: number, query: BoardQuery): Promise<BoardView>;
    getRowErrors(id: number, query: { referenceDate?: string; page: number; pageSize: number }): Promise<RowErrorsView>;
    analyse(id: number, referenceDate?: string): Promise<{ summary: ImportSummary; analysis: BoardAnalysis }>;
    list(
        offset: number,
        limit: number
    ): Promise<{ data: ImportSummary[]; offset: number; limit: number; total: number }>;
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

    async upload(file: { fileName: string; bytes: Buffer }, query: BoardQuery): Promise<UploadResult> {
        const referenceDate = this.resolveReferenceDate(query.referenceDate);
        const parsed = parseBoardCsv(file.bytes);
        if (!parsed.ok) {
            throw new UnprocessableEntityException(
                ERROR_CODES[parsed.error.code as keyof typeof ERROR_CODES],
                parsed.error.message,
                parsed.error.details
            );
        }

        const details: ImportInterface = {
            fileName: file.fileName.slice(0, BOARD_LIMITS.MAX_VALUE_LENGTH),
            fileHash: sha256Hex(file.bytes),
            fileSize: file.bytes.length,
            headerCount: parsed.board.headerCount,
            recordCount: parsed.board.records.length,
        };

        try {
            // Insert, never "check then insert": the unique hash decides, even for two uploads at once.
            const created = await withTransaction((transaction) =>
                this.importRepo.create(details, parsed.board.records, transaction)
            );
            return {
                alreadyImported: false,
                ...this.buildView(toSummary(created), parsed.board, { ...query, referenceDate }),
            };
        } catch (err) {
            if (!(err instanceof UniqueConstraintError)) {
                throw err;
            }
            const existing = await this.importRepo.findByHash(details.fileHash);
            if (!existing) {
                throw err;
            }
            // Same bytes, so the stored rows are the rows we just read.
            return {
                alreadyImported: true,
                ...this.buildView(toSummary(existing), parsed.board, { ...query, referenceDate }),
            };
        }
    }

    async getBoard(id: number, query: BoardQuery): Promise<BoardView> {
        const referenceDate = this.resolveReferenceDate(query.referenceDate);
        const { found, board } = await this.loadBoard(id);
        return this.buildView(toSummary(found), board, { ...query, referenceDate });
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

    // The full analysis of a stored import (also used by insights and export).
    async analyse(id: number, referenceDate?: string): Promise<{ summary: ImportSummary; analysis: BoardAnalysis }> {
        const date = this.resolveReferenceDate(referenceDate);
        const { found, board } = await this.loadBoard(id);
        return {
            summary: toSummary(found),
            analysis: analyseBoard(board, this.configService.getSnapshot().stages, date),
        };
    }

    async list(
        offset: number,
        limit: number
    ): Promise<{ data: ImportSummary[]; offset: number; limit: number; total: number }> {
        const [data, total] = await Promise.all([this.importRepo.list(offset, limit), this.importRepo.count()]);
        return { data: data.map(toSummary), offset, limit, total };
    }

    async remove(id: number): Promise<boolean> {
        const removed = await this.importRepo.delete(id);
        if (!removed) {
            throw new NotFoundException(ERROR_CODES.E_NOT_FOUND, "Import not found");
        }
        return removed;
    }

    private async loadBoard(id: number): Promise<{ found: ImportInterface; board: ParsedBoard }> {
        const found = await this.importRepo.findById(id);
        if (!found) {
            throw new NotFoundException(ERROR_CODES.E_NOT_FOUND, "Import not found");
        }
        const records = await this.importRepo.listRecords(id);
        return { found, board: { headerCount: found.headerCount, records } };
    }

    // Default: today (UTC). Never later than today anywhere on Earth.
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
        board: ParsedBoard,
        query: BoardQuery & { referenceDate: string }
    ): BoardView {
        const { stages, stagesVersion } = this.configService.getSnapshot();
        const analysis = analyseBoard(board, stages, query.referenceDate);

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
