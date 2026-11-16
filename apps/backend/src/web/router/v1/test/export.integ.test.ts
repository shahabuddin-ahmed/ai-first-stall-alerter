import express, { Express } from "express";
import fs from "fs";
import path from "path";
import request from "supertest";
import { parse } from "csv-parse/sync";
import { AiErrorCode, AiNoteStatus, MessageSource, DEFAULT_AI_MODEL } from "../../../../constant/ai";
import { EXPORT_COLUMNS } from "../../../../constant/export";
import { HttpStatus } from "../../../../constant/http";
import { FakeAiGenerator } from "../../../../ai/fake-generator";
import { AiError, AiGenerator, GenerationResult } from "../../../../ai/generator";
import newSequelize from "../../../../infra/sequelize";
import { resetTestDatabase } from "../../../../infra/test/test-database";
import { newAiInsightRepo } from "../../../../repo/ai-insight";
import { newImportRepo } from "../../../../repo/import";
import { newLlmCallRepo } from "../../../../repo/llm-call";
import { newSettingRepo } from "../../../../repo/setting";
import { newStageRepo } from "../../../../repo/stage";
import { InsightFacts } from "../../../../service/hiring-board/ai-facts";
import { FakeModelSource } from "../../../../ai/model-source";
import { newAiModelRepo } from "../../../../repo/ai-model";
import { newAiModelService } from "../../../../service/ai-model";
import { newConfigService } from "../../../../service/config";
import { newExportService } from "../../../../service/export";
import { newImportService } from "../../../../service/import";
import { newInsightService } from "../../../../service/insight";
import { newExportV1Controller } from "../../../controller/v1/export";
import { newImportV1Controller } from "../../../controller/v1/import";
import { newInsightV1Controller } from "../../../controller/v1/insight";
import { newSettingV1Controller } from "../../../controller/v1/setting";
import { globalErrorHandler } from "../../../middleware/global-error-handler";
import { newExportRouter } from "../export";
import { newImportRouter } from "../import";
import { newInsightRouter } from "../insight";
import { newSettingRouter } from "../setting";

// Needs MySQL with the test database. No real AI calls.
const sequelize = newSequelize();
const DATA_DIR = path.resolve(__dirname, "../../../../../../../data");
const SAMPLE_B = fs.readFileSync(path.join(DATA_DIR, "sample-b.csv"));
const EXPECTED_B = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "expected", "sample-b.json"), "utf8")).scenarios
    .default_stages;
const REFERENCE_DATE = "2026-11-13";

class CountingGenerator implements AiGenerator {
    calls = 0;
    behaviour: (facts: InsightFacts) => Promise<GenerationResult> = (facts) =>
        new FakeAiGenerator().generate(facts, DEFAULT_AI_MODEL);

    async generate(facts: InsightFacts): Promise<GenerationResult> {
        this.calls += 1;
        return this.behaviour(facts);
    }
}

const makeApi = async (generator: AiGenerator | null): Promise<Express> => {
    const aiModelService = await newAiModelService(await newAiModelRepo(), new FakeModelSource());
    const configService = await newConfigService(
        await newStageRepo(),
        await newSettingRepo(),
        aiModelService,
        generator !== null
    );
    const importService = await newImportService(await newImportRepo(), configService);
    const insightService = await newInsightService(
        importService,
        configService,
        await newAiInsightRepo(),
        await newLlmCallRepo(),
        generator,
        5
    );
    const exportService = await newExportService(importService, insightService);
    const app = express();
    app.use(express.json());
    app.use("/api/v1/imports/:id/insights", await newInsightRouter(await newInsightV1Controller(insightService)));
    app.use("/api/v1/imports/:id/export", await newExportRouter(await newExportV1Controller(exportService)));
    app.use("/api/v1/imports", await newImportRouter(await newImportV1Controller(importService)));
    app.use("/api/v1/settings", await newSettingRouter(await newSettingV1Controller(configService, aiModelService)));
    app.use(globalErrorHandler);
    return app;
};

const upload = async (app: Express, bytes: Buffer = SAMPLE_B): Promise<number> => {
    const res = await request(app)
        .post("/api/v1/imports")
        .field("referenceDate", REFERENCE_DATE)
        .attach("file", bytes, { filename: "board.csv", contentType: "text/csv" });
    return res.body.response.import.id;
};

const download = (app: Express, importId: number, query = "") =>
    request(app)
        .get(`/api/v1/imports/${importId}/export?referenceDate=${REFERENCE_DATE}${query}`)
        .buffer(true)
        .parse((res, done) => {
            let text = "";
            res.on("data", (chunk) => (text += chunk));
            res.on("end", () => done(null, text));
        });

// Reads the downloaded file the way a spreadsheet would.
const readCsv = (text: string): Record<string, string>[] => parse(text, { bom: true, columns: true });

let generator: CountingGenerator;
let app: Express;
let importId: number;
let warnLog: jest.SpyInstance;

beforeEach(async () => {
    await resetTestDatabase();
    generator = new CountingGenerator();
    app = await makeApi(generator);
    importId = await upload(app);
    warnLog = jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => warnLog.mockRestore());

afterAll(async () => {
    await sequelize.close();
});

describe("GET /api/v1/imports/:id/export", () => {
    it("downloads a CSV file with every column, in rank order", async () => {
        const res = await download(app, importId);

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.headers["content-type"]).toBe("text/csv; charset=utf-8");
        expect(res.headers["content-disposition"]).toBe(
            `attachment; filename="stallalert-${REFERENCE_DATE}-import-${importId}.csv"`
        );

        const rows = readCsv(res.body);
        expect(Object.keys(rows[0])).toEqual([...EXPORT_COLUMNS]);
        expect(rows.map((row) => row.candidate_id)).toEqual(EXPECTED_B.queue.map((item: any) => item.candidate_id));
        expect(rows[0]).toMatchObject({
            rank: "1",
            candidate_id: "127",
            name: "Hana Novak",
            stage: "Applied",
            reference_date: REFERENCE_DATE,
            stage_threshold: "5",
            timer_from: "2026-10-10",
            days_in_stage: "34",
            overdue_days: "29",
            action: "Review the application",
            message_to: "Hiring manager",
        });
        expect(rows.find((row) => row.candidate_id === "0142")).toBeDefined(); // leading zero kept
    });

    it("has a message on every row, and never calls the AI", async () => {
        const rows = readCsv((await download(app, importId)).body);

        rows.forEach((row) => expect(row.message_draft.length).toBeGreaterThan(0));
        expect(generator.calls).toBe(0);
    });

    it("marks every row as pending before AI insights are requested", async () => {
        const rows = readCsv((await download(app, importId)).body);

        expect(new Set(rows.map((row) => row.ai_note_status))).toEqual(new Set([AiNoteStatus.PENDING]));
        rows.forEach((row) => expect(row.message_source).toBe(MessageSource.TEMPLATE));
    });

    it("reuses one AI draft per action for every row, with each candidate's name filled in", async () => {
        await request(app).post(`/api/v1/imports/${importId}/insights`).send({ referenceDate: REFERENCE_DATE });

        const rows = readCsv((await download(app, importId)).body);

        expect(rows).toHaveLength(EXPECTED_B.queue.length);
        rows.forEach((row) => {
            expect([row.ai_note_status, row.message_source]).toEqual([AiNoteStatus.AI_DRAFT, MessageSource.AI_DRAFT]);
            expect(row.message_draft).toContain(row.recruiter);
            expect(row.message_draft).not.toContain("{{");
        });
        const offers = rows.filter((row) => row.stage === "Offer");
        expect(offers.length).toBeGreaterThan(1);
        offers.forEach((row) => expect(row.message_draft).toMatch(/^Hi .+, I wanted to check in on the .+ offer\./));
        expect(generator.calls).toBe(1);
    });

    it("marks every row as unavailable when the last AI call failed", async () => {
        generator.behaviour = async () => {
            throw new AiError(AiErrorCode.TIMEOUT);
        };
        await request(app).post(`/api/v1/imports/${importId}/insights`).send({ referenceDate: REFERENCE_DATE });

        const rows = readCsv((await download(app, importId)).body);

        expect(new Set(rows.map((row) => row.ai_note_status))).toEqual(new Set([AiNoteStatus.UNAVAILABLE]));
        rows.forEach((row) => expect(row.message_source).toBe(MessageSource.TEMPLATE));
    });

    it("marks every row as disabled when the team turned AI drafts off", async () => {
        await request(app)
            .put("/api/v1/settings")
            .send({ useAiDrafts: false, aiModel: DEFAULT_AI_MODEL })
            .expect(HttpStatus.OK);

        const rows = readCsv((await download(app, importId)).body);

        expect(new Set(rows.map((row) => row.ai_note_status))).toEqual(new Set([AiNoteStatus.DISABLED]));
    });

    it("marks every row as unavailable when AI is not set up on the server", async () => {
        const rows = readCsv((await download(await makeApi(null), importId)).body);

        expect(new Set(rows.map((row) => row.ai_note_status))).toEqual(new Set([AiNoteStatus.UNAVAILABLE]));
    });

    it("follows the screen's filters and keeps the original ranks", async () => {
        const rows = readCsv((await download(app, importId, "&stage=Offer")).body);

        const expectedOffer = EXPECTED_B.queue.filter((item: any) => item.stage === "Offer");
        expect(rows.map((row) => [Number(row.rank), row.candidate_id])).toEqual(
            expectedOffer.map((item: any) => [item.rank, item.candidate_id])
        );
    });

    it("stops spreadsheet formulas from running", async () => {
        const board = Buffer.from(
            "candidate_id,name,role,stage,stage_entered_at,recruiter\n" +
                '901,"=HYPERLINK(""http://evil.test"",""click"")",+Analyst,Offer,2026-11-01,@Recruiter\n'
        );
        const rows = readCsv((await download(app, await upload(app, board))).body);

        expect(rows[0]).toMatchObject({
            name: '\'=HYPERLINK("http://evil.test","click")',
            role: "'+Analyst",
            recruiter: "'@Recruiter",
        });
    });

    it("returns 404 (JSON) for an import that does not exist", async () => {
        const res = await request(app).get(`/api/v1/imports/999999/export?referenceDate=${REFERENCE_DATE}`);

        expect(res.status).toBe(HttpStatus.NOT_FOUND);
        expect(res.body.code).toBe("E_NOT_FOUND");
    });
});
