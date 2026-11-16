import { PIPELINE_LIMITS } from "./pipeline";

export enum ERROR_CODES {
    E_PAGE_NOT_FOUND = "E_PAGE_NOT_FOUND",
    E_INVALID_DATA = "E_INVALID_DATA",
    E_INTERNAL_SERVER_ERROR = "E_INTERNAL_SERVER_ERROR",
    E_SERVICE_UNAVAILABLE = "E_SERVICE_UNAVAILABLE",
    E_CONFLICT = "E_CONFLICT",
    E_NOT_FOUND = "E_NOT_FOUND",
    E_TOO_MANY_REQUESTS = "E_TOO_MANY_REQUESTS",
    E_PAYLOAD_TOO_LARGE = "E_PAYLOAD_TOO_LARGE",
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

export const errorMessages: Record<ERROR_CODES, { message: string }> = {
    E_PAGE_NOT_FOUND: {
        message: "The requested endpoint does not exist",
    },
    E_INVALID_DATA: {
        message: "Please provide valid data",
    },
    E_INTERNAL_SERVER_ERROR: {
        message: "Internal Server Error",
    },
    E_SERVICE_UNAVAILABLE: {
        message: "Service temporarily unavailable",
    },
    E_CONFLICT: {
        message: "The data changed since you loaded it. Reload and try again.",
    },
    E_NOT_FOUND: {
        message: "Not found",
    },
    E_TOO_MANY_REQUESTS: {
        message: "Too many requests. Wait a minute and try again.",
    },
    E_PAYLOAD_TOO_LARGE: {
        message: "The request body is too large.",
    },
    FILE_TOO_LARGE: {
        message: `The file is larger than ${PIPELINE_LIMITS.MAX_FILE_BYTES / 1024 / 1024} MB.`,
    },
    UNSUPPORTED_FILE: {
        message: "Upload a .csv file.",
    },
    INVALID_ENCODING: {
        message: "The file is not UTF-8 text.",
    },
    EMPTY_FILE: {
        message: "The file is empty.",
    },
    TOO_MANY_ROWS: {
        message: `The file has more than ${PIPELINE_LIMITS.MAX_RECORDS.toLocaleString("en-US")} candidates.`,
    },
    MISSING_HEADERS: {
        message: "Required columns are missing.",
    },
    DUPLICATE_HEADERS: {
        message: "Some column names appear more than once.",
    },
    INVALID_CSV: {
        message: "The file is not valid CSV.",
    },
    VALUE_TOO_LONG: {
        message: "Some values are too long.",
    },
};

export enum ApiResponseMessages {
    SUCCESS = "SUCCESS",
    INTERNAL_SERVER_ERROR = "Internal Server Error",
    SUCCESS_MESSAGE = "Success",
}
