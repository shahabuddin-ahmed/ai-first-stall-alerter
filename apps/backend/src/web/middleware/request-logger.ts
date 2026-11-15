import { NextFunction, Request, Response } from "express";
import logger from "../../infra/logger";

// One log line per request: method, path (without the query string, which can hold search text),
// status and time. Replaces morgan, which logged full URLs.
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
        logger.info("request", {
            requestId: res.locals.requestId,
            method: req.method,
            path: req.originalUrl.split("?")[0],
            status: res.statusCode,
            ms: Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6),
        });
    });
    next();
};
