import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

export const REQUEST_ID_HEADER = "X-Request-Id";
const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

// Every request gets an id (kept from the caller when it looks safe), sent back in the response
// and written on every log line, so one request can be followed from the browser to the logs.
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
    const incoming = req.get(REQUEST_ID_HEADER);
    const id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
    res.locals.requestId = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
};
