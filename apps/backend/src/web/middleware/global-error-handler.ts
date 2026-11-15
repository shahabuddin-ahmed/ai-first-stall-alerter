import { Request, Response, NextFunction } from "express";
import { errorMessages, ERROR_CODES } from "../../constant/error";
import { NodeEnv } from "../../constant/env";
import { HttpStatus } from "../../constant/http";
import config from "../../config/config";
import logger from "../../infra/logger";
import { ResponseType } from "../controller/controller";

// Errors thrown by express.json() for bad or too large JSON bodies.
const BODY_ERRORS: Record<string, { status: HttpStatus; code: ERROR_CODES }> = {
    "entity.parse.failed": { status: HttpStatus.BAD_REQUEST, code: ERROR_CODES.E_INVALID_DATA },
    "entity.too.large": { status: HttpStatus.PAYLOAD_TOO_LARGE, code: ERROR_CODES.E_PAYLOAD_TOO_LARGE },
};

export const globalErrorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
    const bodyError = BODY_ERRORS[err?.type];
    const statusCode: number = bodyError?.status ?? err?.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const isServerError = statusCode >= HttpStatus.INTERNAL_SERVER_ERROR;

    if (isServerError) {
        // No error message here: database errors can contain row values. The stack only in development.
        logger.error("unhandled error", {
            requestId: res.locals.requestId,
            method: req.method,
            path: req.originalUrl.split("?")[0],
            error: err?.name ?? "Error",
            stack: config.NODE_ENV === NodeEnv.DEVELOPMENT ? err?.stack : undefined,
        });
    }

    const code = isServerError ? ERROR_CODES.E_INTERNAL_SERVER_ERROR : bodyError?.code ?? err?.code ?? ERROR_CODES.E_INVALID_DATA;
    const message = isServerError
        ? errorMessages.E_INTERNAL_SERVER_ERROR.message
        : bodyError
            ? errorMessages[bodyError.code].message
            : err?.message || errorMessages.E_INVALID_DATA.message;

    return res.status(statusCode).send({
        code,
        message,
        response: null,
        // Server errors never return details (they could hold internal data).
        errors: isServerError || bodyError ? [message] : err?.errors || [message],
    } as ResponseType);
};
