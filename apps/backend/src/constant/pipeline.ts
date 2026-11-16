import { STAGE_LIMITS } from "./stage";

export enum PipelineColumn {
    CANDIDATE_ID = "candidate_id",
    NAME = "name",
    ROLE = "role",
    STAGE = "stage",
    STAGE_ENTERED_AT = "stage_entered_at",
    RECRUITER = "recruiter",
    LAST_ACTIVITY_AT = "last_activity_at",
    LAST_CONTACTED_AT = "last_contacted_at",
}

export const REQUIRED_COLUMNS: readonly PipelineColumn[] = [
    PipelineColumn.CANDIDATE_ID,
    PipelineColumn.NAME,
    PipelineColumn.ROLE,
    PipelineColumn.STAGE,
    PipelineColumn.STAGE_ENTERED_AT,
    PipelineColumn.RECRUITER,
];

export const DATE_COLUMNS: readonly PipelineColumn[] = [
    PipelineColumn.STAGE_ENTERED_AT,
    PipelineColumn.LAST_ACTIVITY_AT,
    PipelineColumn.LAST_CONTACTED_AT,
];

export const TEXT_COLUMN_LIMITS = {
    [PipelineColumn.CANDIDATE_ID]: 36,
    [PipelineColumn.NAME]: 50,
    [PipelineColumn.ROLE]: 50,
    [PipelineColumn.STAGE]: STAGE_LIMITS.MAX_NAME_LENGTH,
    [PipelineColumn.RECRUITER]: 50,
} as const;

export const INVALID_DATE_TEXT = "invalid date";

export const PIPELINE_LIMITS = {
    MAX_FILE_BYTES: 5 * 1024 * 1024,
    MAX_RECORDS: 10_000,
    MAX_FILE_NAME_LENGTH: 255,
    MAX_ERROR_DETAILS: 10,
    MIN_BOTTLENECK_STALLED: 2,
    MAX_DUPLICATE_RECORDS: 5,
    INSERT_BATCH_SIZE: 1000,
} as const;

export const LATEST_UTC_OFFSET_MS = 14 * 60 * 60 * 1000;

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

export enum RowErrorCode {
    FIELD_COUNT = "FIELD_COUNT",
    MISSING_VALUE = "MISSING_VALUE",
    INVALID_DATE = "INVALID_DATE",
    FUTURE_DATE = "FUTURE_DATE",
    UNKNOWN_STAGE = "UNKNOWN_STAGE",
    DUPLICATE_ID = "DUPLICATE_ID",
}

export enum BottleneckType {
    STAGE = "stage",
    RECRUITER = "recruiter",
}

export const RECORD_FIELD = "(record)";
