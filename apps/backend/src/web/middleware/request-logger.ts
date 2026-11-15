import { NextFunction, Request, Response } from "express";
import logger from "../../infra/logger";

// The path without the query string (which can hold search text).
export const pathOf = (req: Request): string => req.originalUrl.split("?")[0];

// One log line per request: method, path (without the query string, which can hold search text),
// status and time. Replaces morgan, which logged full URLs.
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
        logger.info("request", {
            requestId: res.locals.requestId,
            method: req.method,
            path: pathOf(req),
            status: res.statusCode,
            ms: Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6),
        });
    });
    next();
};
