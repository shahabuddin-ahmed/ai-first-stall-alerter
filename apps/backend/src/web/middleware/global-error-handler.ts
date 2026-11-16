import { Request, Response, NextFunction } from "express";
import { errorMessages, ERROR_CODES } from "../../constant/error";
import { NodeEnv } from "../../constant/env";
import { HttpStatus } from "../../constant/http";
import config from "../../config/config";
import logger from "../../infra/logger";
import { ResponseType } from "../controller/controller";
import { pathOf } from "./request-logger";

interface BodyError {
    status: HttpStatus;
    code: ERROR_CODES;
}

interface ErrorDetails {
    code: string;
    message: string;
    errors: string[];
}

const BODY_ERRORS: Record<string, BodyError> = {
    "entity.parse.failed": { status: HttpStatus.BAD_REQUEST, code: ERROR_CODES.E_INVALID_DATA },
    "entity.too.large": { status: HttpStatus.PAYLOAD_TOO_LARGE, code: ERROR_CODES.E_PAYLOAD_TOO_LARGE },
};

const detailsOf = (err: any, bodyError: BodyError | undefined, isServerError: boolean): ErrorDetails => {
    if (isServerError) {
        const message = errorMessages.E_INTERNAL_SERVER_ERROR.message;
        return { code: ERROR_CODES.E_INTERNAL_SERVER_ERROR, message, errors: [message] };
    }
    if (bodyError) {
        const message = errorMessages[bodyError.code].message;
        return { code: bodyError.code, message, errors: [message] };
    }
    const message = err.message || errorMessages.E_INVALID_DATA.message;
    return { code: err.code ?? ERROR_CODES.E_INVALID_DATA, message, errors: err.errors || [message] };
};

export const globalErrorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
    const bodyError = BODY_ERRORS[err.type];
    const statusCode: number = bodyError?.status ?? err.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const isServerError = statusCode >= HttpStatus.INTERNAL_SERVER_ERROR;

    if (isServerError) {
        // No error message here: database errors can contain row values. The stack only in development.
        logger.error("unhandled error", {
            requestId: res.locals.requestId,
            method: req.method,
            path: pathOf(req),
            error: err.name ?? "Error",
            stack: config.NODE_ENV === NodeEnv.DEVELOPMENT ? err.stack : undefined,
        });
    }

    const { code, message, errors } = detailsOf(err, bodyError, isServerError);
    const body: ResponseType = { code, message, response: null, errors };
    return res.status(statusCode).send(body);
};
