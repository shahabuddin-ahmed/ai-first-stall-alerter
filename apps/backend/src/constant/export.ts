// The export CSV columns (spec C8), in file order.
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

// A cell that starts with one of these could run as a formula in Excel or Sheets, so it gets a ' in front.
export const FORMULA_START = /^[=+\-@\t\r]/;

export const CSV_CONTENT_TYPE = "text/csv; charset=utf-8";

// Lets Excel read the file as UTF-8 (names with accents).
export const CSV_BOM = "\uFEFF";

// RFC 4180 line ending.
export const CSV_LINE_END = "\r\n";

export const EXPORT_FILE_PREFIX = "stallalert";
