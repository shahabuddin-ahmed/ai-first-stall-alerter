import express, { Express } from "express";
import fs from "fs";
import path from "path";
import request from "supertest";
import { QueryTypes } from "sequelize";
import { AiErrorCode, AiStatus, MessageSource } from "../../../../constant/ai";
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
import { InsightFacts } from "../../../../rules/ai-facts";
import { newConfigService } from "../../../../service/config";
import { newImportService } from "../../../../service/import";
import { newInsightService } from "../../../../service/insight";
import { newImportV1Controller } from "../../../controller/v1/import";
import { newInsightV1Controller } from "../../../controller/v1/insight";
import { newSettingV1Controller } from "../../../controller/v1/setting";
import { globalErrorHandler } from "../../../middleware/global-error-handler";
import { newImportRouter } from "../import";
import { newInsightRouter } from "../insight";
import { newSettingRouter } from "../setting";

// Needs MySQL with the test database. No real AI calls: a counting stand-in replaces the provider.
const sequelize = newSequelize();
const SAMPLE_B = fs.readFileSync(path.resolve(__dirname, "../../../../../../../data/sample-b.csv"));
const REFERENCE_DATE = "2026-11-13";

// Wraps the fake AI so tests can count calls, slow it down or make it fail.
class TestGenerator implements AiGenerator {
    readonly model = "test-model";
    calls = 0;
    seenFacts: InsightFacts[] = [];
    behaviour: (facts: InsightFacts) => Promise<GenerationResult> = (facts) => new FakeAiGenerator().generate(facts);

    async generate(facts: InsightFacts): Promise<GenerationResult> {
        this.calls += 1;
        this.seenFacts.push(facts);
        return this.behaviour(facts);
    }
}

const makeApi = async (generator: AiGenerator | null): Promise<Express> => {
    const configService = await newConfigService(await newStageRepo(), await newSettingRepo(), {
        configured: generator !== null,
        model: generator?.model ?? null,
    });
    const importService = await newImportService(await newImportRepo(), configService);
    const insightService = await newInsightService(
        importService, configService, await newAiInsightRepo(), await newLlmCallRepo(), generator, 5
    );
    const app = express();
    app.use(express.json());
    app.use("/api/v1/imports/:id/insights", await newInsightRouter(await newInsightV1Controller(insightService)));
    app.use("/api/v1/imports", await newImportRouter(await newImportV1Controller(importService)));
    app.use("/api/v1/settings", await newSettingRouter(await newSettingV1Controller(configService)));
    app.use(globalErrorHandler);
    return app;
};

const uploadSampleB = async (app: Express): Promise<number> => {
    const res = await request(app)
        .post("/api/v1/imports")
        .field("referenceDate", REFERENCE_DATE)
        .attach("file", SAMPLE_B, { filename: "sample-b.csv", contentType: "text/csv" });
    return res.body.response.import.id;
};

const insights = (app: Express, importId: number, referenceDate = REFERENCE_DATE) =>
    request(app).post(`/api/v1/imports/${importId}/insights`).send({ referenceDate });

const llmCalls = () =>
    sequelize.query<{ status: string; error_code: string | null; requested_model: string }>(
        "SELECT status, error_code, requested_model FROM llm_calls ORDER BY id",
        { type: QueryTypes.SELECT }
    );

let generator: TestGenerator;
let app: Express;
let importId: number;
let warnLog: jest.SpyInstance;

beforeEach(async () => {
    await resetTestDatabase();
    generator = new TestGenerator();
    app = await makeApi(generator);
    importId = await uploadSampleB(app);
    warnLog = jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => warnLog.mockRestore());

afterAll(async () => {
    await sequelize.close();
});

describe("POST /api/v1/imports/:id/insights with AI", () => {
    it("writes a briefing, bottleneck notes and drafts for the top 5, with names filled in on the server", async () => {
        const res = await insights(app, importId);

        expect(res.status).toBe(HttpStatus.OK);
        const view = res.body.response;
        expect(view).toMatchObject({ aiStatus: AiStatus.AI_DRAFT, errorCode: null, cached: false, model: "test-model", topN: 5 });
        expect(view.briefing.source).toBe(MessageSource.AI_DRAFT);
        expect(view.bottleneckNotes.map((note: any) => [note.key, note.source])).toEqual([
            ["Offer", MessageSource.AI_DRAFT],
            ["Recruiter A", MessageSource.AI_DRAFT],
        ]);
        expect(view.bottleneckNotes[1].text).toContain("Recruiter A"); // "R2" turned back into the name
        expect(view.drafts.map((draft: any) => draft.rank)).toEqual([1, 2, 3, 4, 5]);
        expect(view.drafts[0]).toMatchObject({ candidateId: "127", recipient: "hiring_manager", source: MessageSource.AI_DRAFT });
        expect(view.drafts[0].text).toContain("Hana Novak");
        expect(JSON.stringify(view.drafts)).not.toContain("{{");
        expect(generator.calls).toBe(1);
    });

    it("never sends names or candidate IDs to the AI", async () => {
        await insights(app, importId);

        const sent = JSON.stringify(generator.seenFacts[0]);
        ["Hana Novak", "Jonas Berg", "Recruiter A", "Applied", '"127"', "2026-"].forEach((value) =>
            expect(sent).not.toContain(value)
        );
    });

    it("uses the saved answer the second time (no new AI call)", async () => {
        await insights(app, importId);
        const second = await insights(app, importId);

        expect(second.body.response).toMatchObject({ aiStatus: AiStatus.AI_DRAFT, cached: true });
        expect(generator.calls).toBe(1);
        expect(await llmCalls()).toHaveLength(1);
    });

    it("makes one AI call when three requests arrive at the same moment", async () => {
        generator.behaviour = async (facts) => {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return new FakeAiGenerator().generate(facts);
        };

        const results = await Promise.all([insights(app, importId), insights(app, importId), insights(app, importId)]);

        expect(results.every((res) => res.body.response.aiStatus === AiStatus.AI_DRAFT)).toBe(true);
        expect(generator.calls).toBe(1);
    });

    it("asks again for a new reference date (a different report)", async () => {
        await insights(app, importId);
        await insights(app, importId, "2026-11-12");

        expect(generator.calls).toBe(2);
    });
});

describe("POST /api/v1/imports/:id/insights falls back to templates", () => {
    const expectTemplates = (view: any) => {
        expect(view.briefing.source).toBe(MessageSource.TEMPLATE);
        expect(view.briefing.text).toContain("18 of 32 valid candidates are past their stage threshold");
        expect(view.drafts).toHaveLength(5);
        view.drafts.forEach((draft: any) => expect(draft.source).toBe(MessageSource.TEMPLATE));
        expect(view.drafts[0].text).toContain("could you review Hana Novak's application");
    };

    it.each([
        ["a timeout", AiErrorCode.TIMEOUT],
        ["a rate limit", AiErrorCode.RATE_LIMITED],
        ["a refusal", AiErrorCode.REFUSED],
    ])("on %s, logs it and does not cache the failure", async (_case, code) => {
        generator.behaviour = async () => {
            throw new AiError(code);
        };

        const first = await insights(app, importId);
        expect(first.body.response).toMatchObject({ aiStatus: AiStatus.FAILED, errorCode: code });
        expectTemplates(first.body.response);

        // Retry works: the failure was not cached, so the AI is asked again
        generator.behaviour = (facts) => new FakeAiGenerator().generate(facts);
        const retry = await insights(app, importId);
        expect(retry.body.response.aiStatus).toBe(AiStatus.AI_DRAFT);
        expect(generator.calls).toBe(2);
        expect((await llmCalls()).map((call) => [call.status, call.error_code])).toEqual([
            ["failed", code],
            ["success", null],
        ]);
    });

    it("when the answer breaks a rule (a date in a message), uses templates for the whole report", async () => {
        generator.behaviour = async (facts) => {
            const good = await new FakeAiGenerator().generate(facts);
            const output = good.output as any;
            output.drafts[2].text = "Hi {{first_name}}, please reply by 20 November.";
            return good;
        };

        const res = await insights(app, importId);

        expect(res.body.response).toMatchObject({ aiStatus: AiStatus.FAILED, errorCode: AiErrorCode.INVALID_OUTPUT });
        expectTemplates(res.body.response);
        expect(await sequelize.query("SELECT id FROM ai_insights", { type: QueryTypes.SELECT })).toHaveLength(0);
    });

    it("when the team turned AI drafts off: no AI call", async () => {
        await request(app).put("/api/v1/settings").send({ useAiDrafts: false }).expect(HttpStatus.OK);

        const res = await insights(app, importId);

        expect(res.body.response.aiStatus).toBe(AiStatus.DISABLED);
        expectTemplates(res.body.response);
        expect(generator.calls).toBe(0);
    });

    it("when AI is not set up on the server: no AI call", async () => {
        const noAi = await makeApi(null);

        const res = await insights(noAi, importId);

        expect(res.body.response).toMatchObject({ aiStatus: AiStatus.NOT_CONFIGURED, model: null });
        expectTemplates(res.body.response);
    });

    it("when nobody is stalled: no AI call", async () => {
        const res = await insights(app, importId, "2026-10-01");

        expect(res.body.response.aiStatus).toBe(AiStatus.NOTHING_STALLED);
        expect(res.body.response.drafts).toEqual([]);
        expect(generator.calls).toBe(0);
    });

    it("returns 404 for an import that does not exist", async () => {
        const res = await insights(app, 999999);
        expect(res.status).toBe(HttpStatus.NOT_FOUND);
        expect(generator.calls).toBe(0);
    });
});
