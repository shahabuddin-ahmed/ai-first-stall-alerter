import cors from "cors";
import { RequestHandler } from "express";
import helmet from "helmet";
import { REQUEST_ID_HEADER } from "./request-id";

// Security headers (no "X-Powered-By", no sniffing, no framing). The API only serves JSON and CSV.
export const securityHeaders: RequestHandler = helmet();

// Browsers may call the API only from the web app's origin(s). Other tools (curl, tests) are not affected.
export const newCors = (allowedOrigins: string[]): RequestHandler =>
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE"],
        exposedHeaders: [REQUEST_ID_HEADER, "Content-Disposition"],
        maxAge: 600,
    });
