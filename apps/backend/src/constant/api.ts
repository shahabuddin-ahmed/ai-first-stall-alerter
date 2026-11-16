export const API_PREFIX = "/api/v1";

export const JSON_BODY_LIMIT = "100kb";

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 200,
    DEFAULT_LIST_LIMIT: 25,
    MAX_LIST_LIMIT: 100,
} as const;

export const SEARCH_MAX_LENGTH = 100;

export const UPLOAD_FIELD = "file";
export const UPLOAD_LIMITS = {
    FILES: 1,
    FIELDS: 5,
    FIELD_BYTES: 1024,
} as const;

export const CSV_FILE_EXTENSION = ".csv";

export const CSV_MIME_TYPES: readonly string[] = [
    "text/csv",
    "application/csv",
    "text/plain",
    "application/vnd.ms-excel",
    "application/octet-stream",
    "",
];

export const MS_PER_SECOND = 1000;

export const NS_PER_MS = 1_000_000;

export const RATE_LIMIT_WINDOW_MS = 60 * MS_PER_SECOND;

export const CORS_METHODS = ["GET", "POST", "PUT", "DELETE"];
export const CORS_MAX_AGE_SECONDS = 600;

export const REQUEST_ID_HEADER = "X-Request-Id";
export const SAFE_REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
