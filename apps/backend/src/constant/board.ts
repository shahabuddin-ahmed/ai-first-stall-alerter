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
    // Matches the VARCHAR(255) columns in import_records (and imports.file_name)
    MAX_VALUE_LENGTH: 255,
    // How many examples a file error lists (e.g. the first 10 values that are too long)
    MAX_ERROR_DETAILS: 10,
    // A stage or recruiter is a bottleneck from this many stalled candidates
    MIN_BOTTLENECK_STALLED: 2,
    // Rows are inserted in batches, so a 10,000-row file is a few INSERTs, not one huge one
    INSERT_BATCH_SIZE: 1000,
} as const;

// The reference date may be any real date up to "today" anywhere on Earth (UTC+14 is the latest time zone).
export const LATEST_UTC_OFFSET_MS = 14 * 60 * 60 * 1000;

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

// Where follow-ups pile up: a stage or a recruiter.
export enum BottleneckType {
    STAGE = "stage",
    RECRUITER = "recruiter",
}

// Used as the field name when the whole record is wrong (field count).
export const RECORD_FIELD = "(record)";
