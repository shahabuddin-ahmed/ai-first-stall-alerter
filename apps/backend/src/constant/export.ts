export enum ExportColumn {
    RANK = "rank",
    CANDIDATE_ID = "candidate_id",
    NAME = "name",
    ROLE = "role",
    STAGE = "stage",
    RECRUITER = "recruiter",
    REFERENCE_DATE = "reference_date",
    STAGE_THRESHOLD = "stage_threshold",
    TIMER_FROM = "timer_from",
    DAYS_IN_STAGE = "days_in_stage",
    OVERDUE_DAYS = "overdue_days",
    REASON = "reason",
    ACTION = "action",
    MESSAGE_TO = "message_to",
    MESSAGE_DRAFT = "message_draft",
    MESSAGE_SOURCE = "message_source",
    AI_NOTE_STATUS = "ai_note_status",
}

export const EXPORT_COLUMNS: readonly ExportColumn[] = Object.values(ExportColumn);

export const FORMULA_START = /^[=+\-@\t\r]/;

export const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";

export const CSV_BOM = "\uFEFF";

export const CSV_LINE_END = "\r\n";

export const EXPORT_FILE_PREFIX = "stallalert";
