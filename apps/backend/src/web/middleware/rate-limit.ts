import { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { RATE_LIMIT_WINDOW_MS } from "../../constant/api";
import { ERROR_CODES, errorMessages } from "../../constant/error";
import { HttpStatus } from "../../constant/http";
import { ResponseType } from "../controller/controller";

// Limits how often one IP address can call an expensive endpoint (uploads, AI insights).
// Counts are kept in memory: fine for one API process (several would need a shared store, see README).
export const newRateLimit = (perMinute: number): RequestHandler =>
    rateLimit({
        windowMs: RATE_LIMIT_WINDOW_MS,
        limit: perMinute,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        handler: (_req, res) => {
            res.status(HttpStatus.TOO_MANY_REQUESTS).send({
                code: ERROR_CODES.E_TOO_MANY_REQUESTS,
                message: errorMessages.E_TOO_MANY_REQUESTS.message,
                response: null,
                errors: [errorMessages.E_TOO_MANY_REQUESTS.message],
            } as ResponseType);
        },
    });
