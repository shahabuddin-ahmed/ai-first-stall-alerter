import express, { Express } from "express";
import fs from "fs";
import path from "path";
import request from "supertest";
import { QueryTypes } from "sequelize";
import { ERROR_CODES } from "../../../../constant/error";
import { HttpStatus } from "../../../../constant/http";
import newSequelize from "../../../../infra/sequelize";
import { resetTestDatabase } from "../../../../infra/test/test-database";
import { newImportRepo } from "../../../../repo/import";
import { newSettingRepo } from "../../../../repo/setting";
import { newStageRepo } from "../../../../repo/stage";
import { newConfigService } from "../../../../service/config";
import { newImportService } from "../../../../service/import";
import { newImportV1Controller } from "../../../controller/v1/import";
import { newStageV1Controller } from "../../../controller/v1/stage";
import { globalErrorHandler } from "../../../middleware/global-error-handler";
import { newImportRouter } from "../import";
import { newStageRouter } from "../stage";

// Needs MySQL with the test database (docker compose up db). Each test starts with no imports.
const sequelize = newSequelize();
const DATA_DIR = path.resolve(__dirname, "../../../../../../../data");
const SAMPLE_B = fs.readFileSync(path.join(DATA_DIR, "sample-b.csv"));
const EXPECTED_B = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "expected", "sample-b.json"), "utf8")).scenarios;
const REFERENCE_DATE = "2026-11-13";

const makeApi = async (): Promise<Express> => {
    const configService = await newConfigService(await newStageRepo(), await newSettingRepo(), { configured: false, model: null });
    const importService = await newImportService(await newImportRepo(), configService);
    const app = express();
    app.use(express.json());
    app.use("/api/v1/imports", await newImportRouter(await newImportV1Controller(importService)));
    app.use("/api/v1/stages", await newStageRouter(await newStageV1Controller(configService)));
    app.use(globalErrorHandler);
    return app;
};

const upload = (app: Express, bytes: Buffer, fileName = "sample-b.csv", contentType = "text/csv") =>
    request(app)
        .post("/api/v1/imports")
        .field("referenceDate", REFERENCE_DATE)
        .attach("file", bytes, { filename: fileName, contentType });

const countRows = async (table: string): Promise<number> => {
    const [row] = await sequelize.query<{ total: number }>(`SELECT COUNT(*) AS total FROM ${table}`, { type: QueryTypes.SELECT });
    return Number(row.total);
};

let app: Express;
let errorLog: jest.SpyInstance;

beforeEach(async () => {
    await resetTestDatabase();
    app = await makeApi();
    errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined); // expected 4xx errors
});

afterEach(() => errorLog.mockRestore());

afterAll(async () => {
    await sequelize.close();
});

describe("POST /api/v1/imports", () => {
    it("stores Sample B and returns the expected counts, queue and bottlenecks", async () => {
        const res = await upload(app, SAMPLE_B);

        expect(res.status).toBe(HttpStatus.CREATED);
        const view = res.body.response;
        expect(view.alreadyImported).toBe(false);
        expect(view.import).toMatchObject({ fileName: "sample-b.csv", recordCount: 43, fileSize: SAMPLE_B.length });
        expect(view.counts).toEqual({ total: 43, valid: 32, invalid: 11, terminal: 5, onHold: 0, stalled: 18, notStalled: 9 });
        expect(view.queue.total).toBe(18);
        expect(view.queue.items.map((item: any) => item.candidateId)).toEqual(
            EXPECTED_B.default_stages.queue.map((item: any) => item.candidate_id)
        );
        expect(view.bottlenecks).toEqual(EXPECTED_B.default_stages.bottlenecks);
        expect(await countRows("imports")).toBe(1);
        expect(await countRows("import_records")).toBe(43);
    });

    it("returns the first import when the same file is uploaded again, even under another name", async () => {
        const first = await upload(app, SAMPLE_B);
        const second = await upload(app, SAMPLE_B, "copy of board.csv");

        expect(second.status).toBe(HttpStatus.OK);
        expect(second.body.response.alreadyImported).toBe(true);
        expect(second.body.response.import.id).toBe(first.body.response.import.id);
        expect(await countRows("imports")).toBe(1);
    });

    it("stores the file once when two uploads arrive at the same moment", async () => {
        const results = await Promise.all([upload(app, SAMPLE_B), upload(app, SAMPLE_B), upload(app, SAMPLE_B)]);

        expect(results.map((res) => res.status).sort()).toEqual([HttpStatus.OK, HttpStatus.OK, HttpStatus.CREATED]);
        expect(new Set(results.map((res) => res.body.response.import.id)).size).toBe(1);
        expect(await countRows("imports")).toBe(1);
        expect(await countRows("import_records")).toBe(43);
    });

    it.each([
        ["an empty file", Buffer.from(""), "empty.csv", HttpStatus.UNPROCESSABLE_ENTITY, ERROR_CODES.EMPTY_FILE],
        ["missing columns", Buffer.from("candidate_id,name\n001,Ana"), "board.csv", HttpStatus.UNPROCESSABLE_ENTITY, ERROR_CODES.MISSING_HEADERS],
        ["text that is not UTF-8", Buffer.from([0x61, 0xff, 0x0a]), "board.csv", HttpStatus.UNPROCESSABLE_ENTITY, ERROR_CODES.INVALID_ENCODING],
        ["a spreadsheet file", SAMPLE_B, "board.xlsx", HttpStatus.UNSUPPORTED_MEDIA_TYPE, ERROR_CODES.UNSUPPORTED_FILE],
        ["a file over 5 MB", Buffer.alloc(5 * 1024 * 1024 + 1, "a"), "big.csv", HttpStatus.PAYLOAD_TOO_LARGE, ERROR_CODES.FILE_TOO_LARGE],
    ])("rejects %s and stores nothing", async (_case, bytes, fileName, status, code) => {
        const res = await upload(app, bytes, fileName);

        expect(res.status).toBe(status);
        expect(res.body.code).toBe(code);
        expect(res.body.response).toBeNull();
        expect(await countRows("imports")).toBe(0);
    });

    it("lists the missing columns", async () => {
        const res = await upload(app, Buffer.from("candidate_id,name,role\n001,Ana,QA"));
        expect(res.body.errors).toEqual(["stage", "stage_entered_at", "recruiter"]);
    });

    it("asks for a file when none is sent", async () => {
        const res = await request(app).post("/api/v1/imports").field("referenceDate", REFERENCE_DATE);

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
        expect(res.body.errors).toEqual(["Choose a CSV file to upload"]);
    });

    it.each([
        ["2099-01-01", "referenceDate cannot be in the future"],
        ["2026-02-30", "referenceDate must be a real YYYY-MM-DD date"],
        ["13/11/2026", '"referenceDate" must be a YYYY-MM-DD date'],
    ])("rejects the reference date %s", async (date, message) => {
        const res = await request(app)
            .post("/api/v1/imports")
            .field("referenceDate", date)
            .attach("file", SAMPLE_B, { filename: "sample-b.csv", contentType: "text/csv" });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
        expect(res.body.errors).toEqual([message]);
        expect(await countRows("imports")).toBe(0);
    });
});

describe("GET /api/v1/imports/:id", () => {
    let importId: number;

    beforeEach(async () => {
        importId = (await upload(app, SAMPLE_B)).body.response.import.id;
    });

    it("recalculates for another reference date without uploading again", async () => {
        const res = await request(app).get(`/api/v1/imports/${importId}?referenceDate=2026-11-06`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.response.referenceDate).toBe("2026-11-06");
        expect(res.body.response.counts.stalled).toBeLessThan(18);
    });

    it("filters by stage and keeps the original ranks", async () => {
        const res = await request(app).get(`/api/v1/imports/${importId}?referenceDate=${REFERENCE_DATE}&stage=Offer`);

        const expectedOffer = EXPECTED_B.default_stages.queue.filter((item: any) => item.stage === "Offer");
        expect(res.body.response.queue.total).toBe(5);
        expect(res.body.response.queue.items.map((item: any) => [item.rank, item.candidateId])).toEqual(
            expectedOffer.map((item: any) => [item.rank, item.candidate_id])
        );
        expect(res.body.response.counts.stalled).toBe(18); // counts are for the whole board
    });

    it("filters by recruiter and search text, and pages the queue", async () => {
        const byRecruiter = await request(app).get(`/api/v1/imports/${importId}?referenceDate=${REFERENCE_DATE}&recruiter=Recruiter A`);
        expect(byRecruiter.body.response.queue.total).toBe(7);

        const bySearch = await request(app).get(`/api/v1/imports/${importId}?referenceDate=${REFERENCE_DATE}&search=hana`);
        expect(bySearch.body.response.queue.items.map((item: any) => item.candidateId)).toEqual(["127"]);

        const page2 = await request(app).get(`/api/v1/imports/${importId}?referenceDate=${REFERENCE_DATE}&page=2&pageSize=5`);
        expect(page2.body.response.queue.items.map((item: any) => item.rank)).toEqual([6, 7, 8, 9, 10]);
        expect(page2.body.response.queue.total).toBe(18);
    });

    it("uses new stage thresholds straight away", async () => {
        const stages = (await request(app).get("/api/v1/stages")).body.response;
        const allSeven = stages.stages.map(({ name, type, thresholdDays, aliases, actionCode }: any) => ({
            name, type, aliases, actionCode, thresholdDays: type === "watched" ? 7 : thresholdDays,
        }));
        await request(app).put("/api/v1/stages").send({ version: stages.version, stages: allSeven }).expect(HttpStatus.OK);

        const res = await request(app).get(`/api/v1/imports/${importId}?referenceDate=${REFERENCE_DATE}`);
        expect(res.body.response.counts.stalled).toBe(20);
        expect(res.body.response.queue.items.map((item: any) => item.candidateId)).toEqual(
            EXPECTED_B.all_thresholds_7.queue.map((item: any) => item.candidate_id)
        );
    });

    it("gives every queue item its reason, action, recipient and template message", async () => {
        const res = await request(app).get(`/api/v1/imports/${importId}?referenceDate=${REFERENCE_DATE}&pageSize=1`);

        expect(res.body.response.queue.items[0]).toMatchObject({
            rank: 1,
            candidateId: "127",
            actionLabel: "Review the application",
            recipient: "hiring_manager",
            reason: expect.stringContaining("Hana Novak has been in Applied for 34 days"),
            templateMessage: expect.stringContaining("could you review Hana Novak's application"),
        });
    });

    it("returns 404 for an import that does not exist", async () => {
        const res = await request(app).get(`/api/v1/imports/999999?referenceDate=${REFERENCE_DATE}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
        expect(res.body.code).toBe(ERROR_CODES.E_NOT_FOUND);
    });
});

describe("other import endpoints", () => {
    let importId: number;

    beforeEach(async () => {
        importId = (await upload(app, SAMPLE_B)).body.response.import.id;
    });

    it("GET /:id/errors lists the 11 row errors, in pages", async () => {
        const all = await request(app).get(`/api/v1/imports/${importId}/errors?referenceDate=${REFERENCE_DATE}`);
        expect(all.body.response.total).toBe(11);
        expect(all.body.response.items.map((row: any) => row.recordNumber)).toEqual([3, 16, 17, 19, 20, 21, 27, 29, 30, 37, 42]);

        const page = await request(app).get(`/api/v1/imports/${importId}/errors?referenceDate=${REFERENCE_DATE}&page=3&pageSize=5`);
        expect(page.body.response.items.map((row: any) => row.recordNumber)).toEqual([42]);
    });

    it("GET / lists imports, newest first", async () => {
        await upload(app, Buffer.from(fs.readFileSync(path.join(DATA_DIR, "sample-a.csv"))), "sample-a.csv");

        const res = await request(app).get("/api/v1/imports");
        expect(res.body.response.total).toBe(2);
        expect(res.body.response.data.map((item: any) => item.fileName)).toEqual(["sample-a.csv", "sample-b.csv"]);
    });

    it("DELETE /:id removes the import and its rows", async () => {
        const res = await request(app).delete(`/api/v1/imports/${importId}`);

        expect(res.status).toBe(HttpStatus.OK);
        expect(await countRows("imports")).toBe(0);
        expect(await countRows("import_records")).toBe(0);
        expect((await request(app).delete(`/api/v1/imports/${importId}`)).status).toBe(HttpStatus.NOT_FOUND);
    });
});
