// Limits and defaults for requests to the API.
export const API_PREFIX = "/api/v1";

// JSON bodies are small (stage lists, settings). CSV files come in as multipart (see UPLOAD_LIMITS).
export const JSON_BODY_LIMIT = "100kb";

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 200,
    DEFAULT_LIST_LIMIT: 25,
    MAX_LIST_LIMIT: 100,
} as const;

export const SEARCH_MAX_LENGTH = 100;

// One CSV file in the "file" field, plus a few small text fields (referenceDate, filters).
export const UPLOAD_FIELD = "file";
export const UPLOAD_LIMITS = {
    FILES: 1,
    FIELDS: 5,
    FIELD_BYTES: 1024,
} as const;

export const CSV_FILE_EXTENSION = ".csv";

// Browsers and spreadsheet apps send CSV files with different types; the .csv name is required too.
export const CSV_MIME_TYPES: readonly string[] = [
    "text/csv",
    "application/csv",
    "text/plain",
    "application/vnd.ms-excel",
    "application/octet-stream",
    "",
];

export const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// CORS: what the web app may use, and how long a browser may remember the answer.
export const CORS_METHODS = ["GET", "POST", "PUT", "DELETE"];
export const CORS_MAX_AGE_SECONDS = 600;

// Every request gets an id; one sent by the caller is kept only when it looks safe.
export const REQUEST_ID_HEADER = "X-Request-Id";
export const SAFE_REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

// "YYYY-MM-DD" (format only; the service checks that the date is real).
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
