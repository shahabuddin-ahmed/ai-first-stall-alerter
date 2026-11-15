import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";
import { REQUEST_ID_HEADER, SAFE_REQUEST_ID } from "../../constant/api";

// Every request gets an id (kept from the caller when it looks safe), sent back in the response
// and written on every log line, so one request can be followed from the browser to the logs.
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
    const incoming = req.get(REQUEST_ID_HEADER);
    const id = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    res.locals.requestId = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
};
