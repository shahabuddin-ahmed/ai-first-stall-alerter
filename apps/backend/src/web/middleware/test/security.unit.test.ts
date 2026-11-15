import express, { Express } from "express";
import request from "supertest";
import { ERROR_CODES } from "../../../constant/error";
import { HttpStatus } from "../../../constant/http";
import { globalErrorHandler } from "../global-error-handler";
import { newRateLimit } from "../rate-limit";
import { REQUEST_ID_HEADER, requestId } from "../request-id";
import { newCors, securityHeaders } from "../security";

const WEB_APP = "http://localhost:3000";

const makeApp = (setup: (app: Express) => void = () => undefined): Express => {
    const app = express();
    app.use(securityHeaders);
    app.use(requestId);
    app.use(newCors([WEB_APP]));
    app.use(express.json({ limit: "1kb" }));
    setup(app);
    app.get("/ok", (_req, res) => {
        res.send({ ok: true });
    });
    app.post("/echo", (req, res) => {
        res.send(req.body);
    });
    app.get("/boom", () => {
        throw new Error("Duplicate entry 'Hana Novak' for key 'secret_index'");
    });
    app.use(globalErrorHandler);
    return app;
};

let errorLog: jest.SpyInstance;

beforeEach(() => {
    errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => errorLog.mockRestore());

describe("CORS", () => {
    it("lets the web app call the API", async () => {
        const res = await request(makeApp())
            .options("/ok")
            .set("Origin", WEB_APP)
            .set("Access-Control-Request-Method", "PUT");

        expect(res.headers["access-control-allow-origin"]).toBe(WEB_APP);
        expect(res.headers["access-control-allow-methods"]).toContain("PUT");
    });

    it("does not let other websites call the API from a browser", async () => {
        const res = await request(makeApp()).get("/ok").set("Origin", "https://evil.example");

        expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });
});

describe("security headers", () => {
    it("hides the server type and stops content sniffing and framing", async () => {
        const res = await request(makeApp()).get("/ok");

        expect(res.headers["x-powered-by"]).toBeUndefined();
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
        expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    });
});

describe("request id", () => {
    it("gives every response an id", async () => {
        const res = await request(makeApp()).get("/ok");
        expect(res.headers[REQUEST_ID_HEADER.toLowerCase()]).toMatch(/^[0-9a-f-]{36}$/);
    });

    it("keeps a safe id from the caller and replaces an unsafe one", async () => {
        const kept = await request(makeApp()).get("/ok").set(REQUEST_ID_HEADER, "web-12345678");
        expect(kept.headers[REQUEST_ID_HEADER.toLowerCase()]).toBe("web-12345678");

        const replaced = await request(makeApp()).get("/ok").set(REQUEST_ID_HEADER, "<script>alert(1)</script>");
        expect(replaced.headers[REQUEST_ID_HEADER.toLowerCase()]).toMatch(/^[0-9a-f-]{36}$/);
    });
});

describe("rate limit", () => {
    it("answers 429 with the usual error shape after the limit", async () => {
        const app = makeApp((a) => a.get("/ok", newRateLimit(2)));

        await request(app).get("/ok").expect(HttpStatus.OK);
        await request(app).get("/ok").expect(HttpStatus.OK);
        const third = await request(app).get("/ok");

        expect(third.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(third.body).toMatchObject({ code: ERROR_CODES.E_TOO_MANY_REQUESTS, response: null });
        expect(third.headers["retry-after"]).toBeDefined();
    });
});

describe("globalErrorHandler", () => {
    it("answers 400 for broken JSON", async () => {
        const res = await request(makeApp()).post("/echo").set("Content-Type", "application/json").send("{bad json");

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
        expect(res.body.code).toBe(ERROR_CODES.E_INVALID_DATA);
    });

    it("answers 413 for a body that is too large", async () => {
        const res = await request(makeApp())
            .post("/echo")
            .send({ text: "x".repeat(2000) });

        expect(res.status).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
        expect(res.body.code).toBe(ERROR_CODES.E_PAYLOAD_TOO_LARGE);
    });

    it("hides server error details from the response and the log", async () => {
        const res = await request(makeApp()).get("/boom");

        expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(res.body).toEqual({
            code: ERROR_CODES.E_INTERNAL_SERVER_ERROR,
            message: "Internal Server Error",
            response: null,
            errors: ["Internal Server Error"],
        });
        const logged = errorLog.mock.calls.map((call) => call.join(" ")).join("\n");
        expect(logged).toContain("unhandled error");
        expect(logged).not.toContain("Hana Novak");
    });
});
