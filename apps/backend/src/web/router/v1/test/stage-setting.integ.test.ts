import express, { Express } from "express";
import fs from "fs";
import path from "path";
import request from "supertest";
import { QueryTypes } from "sequelize";
import { DEFAULT_AI_MODEL } from "../../../../constant/ai";
import { ERROR_CODES } from "../../../../constant/error";
import { HttpStatus } from "../../../../constant/http";
import { StageType } from "../../../../constant/stage";
import newSequelize from "../../../../infra/sequelize";
import { resetTestDatabase } from "../../../../infra/test/test-database";
import { newSettingRepo } from "../../../../repo/setting";
import { newStageRepo } from "../../../../repo/stage";
import { analyseBoard } from "../../../../rules/analyse-board";
import { parseBoardCsv } from "../../../../rules/csv-reader";
import { FAKE_MODELS, FakeModelSource } from "../../../../ai/model-source";
import { newAiModelRepo } from "../../../../repo/ai-model";
import { newAiModelService } from "../../../../service/ai-model";
import { ConfigService, newConfigService } from "../../../../service/config";
import { newSettingV1Controller } from "../../../controller/v1/setting";
import { newStageV1Controller } from "../../../controller/v1/stage";
import { globalErrorHandler } from "../../../middleware/global-error-handler";
import { newSettingRouter } from "../setting";
import { newStageRouter } from "../stage";

// Needs MySQL with the test database (docker compose up db). Each test starts from the default stages.
const sequelize = newSequelize();
const SAMPLE_B = path.resolve(__dirname, "../../../../../../../data/sample-b.csv");

// One API process: its own memory copy of stages and settings.
const makeApi = async (): Promise<{ app: Express; service: ConfigService }> => {
    const aiModelService = await newAiModelService(await newAiModelRepo(), new FakeModelSource());
    const service = await newConfigService(await newStageRepo(), await newSettingRepo(), aiModelService, false);
    const app = express();
    app.use(express.json());
    app.use("/api/v1/stages", await newStageRouter(await newStageV1Controller(service)));
    app.use("/api/v1/settings", await newSettingRouter(await newSettingV1Controller(service, aiModelService)));
    app.use(globalErrorHandler);
    return { app, service };
};

const dbValue = async <T>(sql: string): Promise<T> => {
    const [row] = await sequelize.query<{ value: T }>(sql, { type: QueryTypes.SELECT });
    return row.value;
};

// The stages as the page would send them back (no position: the list order is the pipeline).
const editableStages = (stages: any[]) =>
    stages.map(({ name, type, thresholdDays, aliases, actionCode }) => ({
        name,
        type,
        thresholdDays,
        aliases,
        actionCode,
    }));

let api: { app: Express; service: ConfigService };
let errorLog: jest.SpyInstance;

beforeEach(async () => {
    await resetTestDatabase();
    api = await makeApi();
    errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined); // expected 4xx errors
});

afterEach(() => errorLog.mockRestore());

afterAll(async () => {
    await sequelize.close();
});

describe("GET /api/v1/stages", () => {
    it("returns the 10 default stages in order, with who each message goes to", async () => {
        const res = await request(api.app).get("/api/v1/stages");

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.response.version).toBe(1);
        expect(res.body.response.stages.map((s: any) => s.name)).toEqual([
            "Applied",
            "Screening",
            "Interview",
            "Assessment",
            "Reference check",
            "Offer",
            "On hold",
            "Hired",
            "Rejected",
            "Withdrawn",
        ]);
        expect(res.body.response.stages[0]).toMatchObject({
            thresholdDays: 5,
            actionCode: "REVIEW_APPLICATION",
            recipient: "hiring_manager",
            aliases: ["New", "Sourced"],
        });
        expect(res.body.response.actions).toHaveLength(7);
    });
});

describe("PUT /api/v1/stages", () => {
    it("saves a new threshold to MySQL and memory, and adds 1 to the version", async () => {
        const { stages } = (await request(api.app).get("/api/v1/stages")).body.response;
        const edited = editableStages(stages).map((s) => (s.name === "Offer" ? { ...s, thresholdDays: 5 } : s));

        const res = await request(api.app).put("/api/v1/stages").send({ version: 1, stages: edited });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.response.version).toBe(2);
        expect(await dbValue("SELECT threshold_days AS value FROM stages WHERE name = 'Offer'")).toBe(5);
        expect(await dbValue("SELECT stages_version AS value FROM settings")).toBe(2);
        expect(api.service.getSnapshot().stages.find((s) => s.name === "Offer")?.thresholdDays).toBe(5);
    });

    it("changes the queue without uploading the file again", async () => {
        const parsed = parseBoardCsv(fs.readFileSync(SAMPLE_B));
        if (!parsed.ok) throw new Error("sample B rejected");
        const stalled = () => analyseBoard(parsed.board, api.service.getSnapshot().stages, "2026-11-13").counts.stalled;
        expect(stalled()).toBe(18);

        const { stages } = (await request(api.app).get("/api/v1/stages")).body.response;
        const allSeven = editableStages(stages).map((s) =>
            s.type === StageType.WATCHED ? { ...s, thresholdDays: 7 } : s
        );
        await request(api.app).put("/api/v1/stages").send({ version: 1, stages: allSeven }).expect(HttpStatus.OK);

        expect(stalled()).toBe(20); // the all_thresholds_7 expected result
    });

    it("lets a team add a CSV name as an alias, so those rows stop being errors", async () => {
        const parsed = parseBoardCsv(fs.readFileSync(SAMPLE_B));
        if (!parsed.ok) throw new Error("sample B rejected");
        const invalid = () => analyseBoard(parsed.board, api.service.getSnapshot().stages, "2026-11-13").counts.invalid;
        expect(invalid()).toBe(11);

        const { stages } = (await request(api.app).get("/api/v1/stages")).body.response;
        const edited = editableStages(stages).map((s) =>
            s.name === "Assessment" ? { ...s, aliases: [...s.aliases, "Technical Test"] } : s
        );
        await request(api.app).put("/api/v1/stages").send({ version: 1, stages: edited }).expect(HttpStatus.OK);

        expect(invalid()).toBe(10);
    });

    it("refuses a save made from an old version, and changes nothing", async () => {
        const { stages } = (await request(api.app).get("/api/v1/stages")).body.response;

        const res = await request(api.app)
            .put("/api/v1/stages")
            .send({ version: 7, stages: editableStages(stages) });

        expect(res.status).toBe(HttpStatus.CONFLICT);
        expect(res.body.code).toBe(ERROR_CODES.E_CONFLICT);
        expect(await dbValue("SELECT stages_version AS value FROM settings")).toBe(1);
    });

    it("lets only one of two saves at the same moment win, even from two API processes", async () => {
        const other = await makeApi();
        const { stages } = (await request(api.app).get("/api/v1/stages")).body.response;
        const body = { version: 1, stages: editableStages(stages) };

        const results = await Promise.all([
            request(api.app).put("/api/v1/stages").send(body),
            request(other.app).put("/api/v1/stages").send(body),
        ]);

        expect(results.map((res) => res.status).sort()).toEqual([HttpStatus.OK, HttpStatus.CONFLICT]);
        expect(await dbValue("SELECT stages_version AS value FROM settings")).toBe(2);
        expect(await dbValue("SELECT COUNT(*) AS value FROM stages")).toBe(10);
    });

    it.each([
        [
            "an alias used twice",
            (s: any[]) => s.map((x) => (x.name === "Offer" ? { ...x, aliases: ["Onsite"] } : x)),
            '"Onsite" is used more than once (as a stage name or alias).',
        ],
        [
            "no watched stage",
            (s: any[]) => s.filter((x) => x.type !== StageType.WATCHED),
            "Add at least one watched stage.",
        ],
        [
            "a watched stage with no action",
            (s: any[]) => s.map((x) => (x.name === "Applied" ? { ...x, actionCode: null } : x)),
            '"Applied" needs a follow-up action.',
        ],
        [
            "an unknown action code",
            (s: any[]) => s.map((x) => (x.name === "Applied" ? { ...x, actionCode: "CALL_MOM" } : x)),
            '"stages[0].actionCode" must be one of',
        ],
        [
            "a name with symbols",
            (s: any[]) => s.map((x) => (x.name === "Applied" ? { ...x, name: "Applied!" } : x)),
            '"stages[0].name" can only use letters, digits, spaces and dashes',
        ],
        [
            "a threshold over 90 days",
            (s: any[]) => s.map((x) => (x.name === "Applied" ? { ...x, thresholdDays: 91 } : x)),
            '"stages[0].thresholdDays" must be less than or equal to 90',
        ],
    ])("rejects %s with a clear message and changes nothing", async (_case, change, message) => {
        const { stages } = (await request(api.app).get("/api/v1/stages")).body.response;

        const res = await request(api.app)
            .put("/api/v1/stages")
            .send({ version: 1, stages: change(editableStages(stages)) });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
        expect(res.body.code).toBe(ERROR_CODES.E_INVALID_DATA);
        expect(res.body.errors.join(" | ")).toContain(message);
        expect(await dbValue("SELECT stages_version AS value FROM settings")).toBe(1);
    });
});

describe("/api/v1/settings", () => {
    it("shows the team setting and whether AI is set up, never the key", async () => {
        const res = await request(api.app).get("/api/v1/settings");

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.response).toEqual({
            useAiDrafts: true,
            aiConfigured: false,
            aiModel: DEFAULT_AI_MODEL,
            stagesVersion: 1,
        });
        expect(JSON.stringify(res.body)).not.toMatch(/key/i);
    });

    it("turns AI drafts off in MySQL and memory", async () => {
        const res = await request(api.app)
            .put("/api/v1/settings")
            .send({ useAiDrafts: false, aiModel: DEFAULT_AI_MODEL });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.response.useAiDrafts).toBe(false);
        expect(await dbValue("SELECT use_ai_drafts AS value FROM settings")).toBe(0);
        expect(api.service.getSnapshot().useAiDrafts).toBe(false);
    });

    it("rejects a value that is not true or false", async () => {
        const res = await request(api.app)
            .put("/api/v1/settings")
            .send({ useAiDrafts: "yes", aiModel: DEFAULT_AI_MODEL });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
        expect(await dbValue("SELECT use_ai_drafts AS value FROM settings")).toBe(1);
    });

    it("saves the picked AI model in MySQL and memory", async () => {
        const res = await request(api.app)
            .put("/api/v1/settings")
            .send({ useAiDrafts: true, aiModel: "fake/other-model:free" });

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.response.aiModel).toBe("fake/other-model:free");
        expect(await dbValue("SELECT ai_model AS value FROM settings")).toBe("fake/other-model:free");
        expect(api.service.getSnapshot().aiModel).toBe("fake/other-model:free");
    });

    it("rejects a model that is not in the free model list", async () => {
        const res = await request(api.app).put("/api/v1/settings").send({ useAiDrafts: true, aiModel: "paid/model" });

        expect(res.status).toBe(HttpStatus.BAD_REQUEST);
        expect(res.body.errors).toEqual(['"paid/model" is not one of the free AI models.']);
        expect(await dbValue("SELECT ai_model AS value FROM settings")).toBe(DEFAULT_AI_MODEL);
    });

    it("lists the free models and saves them in MySQL", async () => {
        const res = await request(api.app).get("/api/v1/settings/models");

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body.response).toEqual([...FAKE_MODELS].sort((a, b) => a.name.localeCompare(b.name)));
        expect(await dbValue("SELECT COUNT(*) AS value FROM ai_models")).toBe(FAKE_MODELS.length);
    });
});
