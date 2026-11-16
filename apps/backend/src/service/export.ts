import { AiNoteStatus, MessageSource } from "../constant/ai";
import { EXPORT_FILE_PREFIX, ExportColumn } from "../constant/export";
import { buildExportCsv, ExportRow } from "./pipeline-csv";
import { fillPlaceholders, RECIPIENT_LABELS } from "./pipeline-messages";
import { filterQueue } from "./pipeline-analysis";
import { QueueItem } from "./pipeline-types";
import { ImportServiceInterface, ReportQuery } from "./import";
import { InsightServiceInterface, SavedDrafts } from "./insight";

export interface ExportFile {
    fileName: string;
    csv: string;
    rowCount: number;
}

export interface ExportServiceInterface {
    exportCsv(importId: number, query: ReportQuery): Promise<ExportFile>;
}

const noteStatusOf = (item: QueueItem, saved: SavedDrafts): AiNoteStatus => {
    if (saved.status !== AiNoteStatus.AI_DRAFT) {
        return saved.status;
    }
    if (item.rank > saved.topN) {
        return AiNoteStatus.NOT_IN_TOP_N;
    }
    if (!saved.draftsByAction.has(item.actionCode)) {
        return AiNoteStatus.UNAVAILABLE;
    }
    return AiNoteStatus.AI_DRAFT;
};

export class ExportService implements ExportServiceInterface {
    constructor(
        private importService: ImportServiceInterface,
        private insightService: InsightServiceInterface
    ) {}

    async exportCsv(importId: number, query: ReportQuery): Promise<ExportFile> {
        const { analysis } = await this.importService.analyse(importId, query.referenceDate);
        const saved = await this.insightService.getSavedDrafts(importId, analysis);

        const rows: ExportRow[] = filterQueue(analysis.queue, query).map((item) => {
            const noteStatus = noteStatusOf(item, saved);
            const draft = saved.draftsByAction.get(item.actionCode);
            const aiDraft = noteStatus === AiNoteStatus.AI_DRAFT && draft ? fillPlaceholders(draft, item) : undefined;
            return {
                [ExportColumn.RANK]: item.rank,
                [ExportColumn.CANDIDATE_ID]: item.candidateId,
                [ExportColumn.NAME]: item.name,
                [ExportColumn.ROLE]: item.role,
                [ExportColumn.STAGE]: item.stage,
                [ExportColumn.RECRUITER]: item.recruiter,
                [ExportColumn.REFERENCE_DATE]: analysis.referenceDate,
                [ExportColumn.STAGE_THRESHOLD]: item.stageThreshold,
                [ExportColumn.TIMER_FROM]: item.timerFrom,
                [ExportColumn.DAYS_IN_STAGE]: item.daysInStage,
                [ExportColumn.OVERDUE_DAYS]: item.overdueDays,
                [ExportColumn.REASON]: item.reason,
                [ExportColumn.ACTION]: item.actionLabel,
                [ExportColumn.MESSAGE_TO]: RECIPIENT_LABELS[item.recipient],
                [ExportColumn.MESSAGE_DRAFT]: aiDraft ?? item.templateMessage,
                [ExportColumn.MESSAGE_SOURCE]: aiDraft ? MessageSource.AI_DRAFT : MessageSource.TEMPLATE,
                [ExportColumn.AI_NOTE_STATUS]: noteStatus,
            };
        });

        return {
            fileName: `${EXPORT_FILE_PREFIX}-${analysis.referenceDate}-import-${importId}.csv`,
            csv: buildExportCsv(rows),
            rowCount: rows.length,
        };
    }
}

export const newExportService = async (
    importService: ImportServiceInterface,
    insightService: InsightServiceInterface
): Promise<ExportService> => {
    return new ExportService(importService, insightService);
};
