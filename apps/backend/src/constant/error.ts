export enum ERROR_CODES {
    E_PAGE_NOT_FOUND = "E_PAGE_NOT_FOUND",
    E_INVALID_DATA = "E_INVALID_DATA",
    E_INTERNAL_SERVER_ERROR = "E_INTERNAL_SERVER_ERROR",
    E_SERVICE_UNAVAILABLE = "E_SERVICE_UNAVAILABLE",
    E_CONFLICT = "E_CONFLICT",
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
};

export enum ApiResponseMessages {
    SUCCESS = "SUCCESS",
    INTERNAL_SERVER_ERROR = "Internal Server Error",
}
