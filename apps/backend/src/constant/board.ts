// The hiring-board CSV contract (spec C1) and its limits (spec C7).

export enum BoardColumn {
    CANDIDATE_ID = "candidate_id",
    NAME = "name",
    ROLE = "role",
    STAGE = "stage",
    STAGE_ENTERED_AT = "stage_entered_at",
    RECRUITER = "recruiter",
    LAST_ACTIVITY_AT = "last_activity_at",
    LAST_CONTACTED_AT = "last_contacted_at",
}

export const REQUIRED_COLUMNS: readonly BoardColumn[] = [
    BoardColumn.CANDIDATE_ID,
    BoardColumn.NAME,
    BoardColumn.ROLE,
    BoardColumn.STAGE,
    BoardColumn.STAGE_ENTERED_AT,
    BoardColumn.RECRUITER,
];

export const OPTIONAL_DATE_COLUMNS: readonly BoardColumn[] = [
    BoardColumn.LAST_ACTIVITY_AT,
    BoardColumn.LAST_CONTACTED_AT,
];

export const KNOWN_COLUMNS: readonly BoardColumn[] = [...REQUIRED_COLUMNS, ...OPTIONAL_DATE_COLUMNS];

export const BOARD_LIMITS = {
    MAX_FILE_BYTES: 5 * 1024 * 1024,
    MAX_RECORDS: 10_000,
    // Matches the VARCHAR(255) columns in import_records
    MAX_VALUE_LENGTH: 255,
} as const;

// Problems that reject the whole file. Nothing is stored.
export enum FileErrorCode {
    FILE_TOO_LARGE = "FILE_TOO_LARGE",
    UNSUPPORTED_FILE = "UNSUPPORTED_FILE",
    INVALID_ENCODING = "INVALID_ENCODING",
    EMPTY_FILE = "EMPTY_FILE",
    TOO_MANY_ROWS = "TOO_MANY_ROWS",
    MISSING_HEADERS = "MISSING_HEADERS",
    DUPLICATE_HEADERS = "DUPLICATE_HEADERS",
    INVALID_CSV = "INVALID_CSV",
    VALUE_TOO_LONG = "VALUE_TOO_LONG",
}

// Problems with one record. The record is left out; the rest still rank.
export enum RowErrorCode {
    FIELD_COUNT = "FIELD_COUNT",
    MISSING_VALUE = "MISSING_VALUE",
    INVALID_DATE = "INVALID_DATE",
    FUTURE_DATE = "FUTURE_DATE",
    UNKNOWN_STAGE = "UNKNOWN_STAGE",
    DUPLICATE_ID = "DUPLICATE_ID",
}

// Used as the field name when the whole record is wrong (field count).
export const RECORD_FIELD = "(record)";
