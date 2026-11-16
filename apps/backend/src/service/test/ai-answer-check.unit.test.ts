import { AxiosError } from "axios";
import { AiErrorCode } from "../../constant/ai";
import { ActionCode, RecipientType } from "../../constant/stage";
import { InsightFacts } from "../pipeline-messages";
import { AiModelInterface } from "../../model/ai-model";
import { AiModelRepoInterface } from "../../repo/ai-model";
import { AiOutput, AiService } from "../ai";
import { BottleneckType } from "../../constant/pipeline";

const FACTS: InsightFacts = {
    board: {
        total: 43,
        valid: 32,
        invalid: 11,
        terminal: 5,
        on_hold: 0,
        stalled: 18,
        not_stalled: 9,
        stalled_by_action: { REVIEW_APPLICATION: 5, CONFIRM_OFFER: 5 },
        stalled_by_recruiter: [{ recruiter_key: "R1", stalled: 7 }],
        stalled_by_other_recruiters: 11,
    },
    bottlenecks: [{ type: BottleneckType.STAGE, action_code: ActionCode.CONFIRM_OFFER, stalled: 5 }],
    alerts: [1, 2].map((rank) => ({
        rank,
        action_code: ActionCode.CONFIRM_OFFER,
        recipient_type: RecipientType.CANDIDATE,
        stage_threshold: 3,
        days_in_stage: 10,
        overdue_days: 7,
        days_since_contact: null,
        recruiter_key: "R1",
    })),
};

const VALID: AiOutput = {
    briefing: "18 candidates are stalled. Start with rank 1 and rank 2; R1 owns 7 follow-ups.",
    bottleneck_notes: ["Offers are piling up: 5 are waiting for a decision. Confirm them first."],
    drafts: [
        {
            action_code: ActionCode.REVIEW_APPLICATION,
            text: "Hi, could you review {{name}}'s application for the {{role}} role? Thanks, {{recruiter}}",
        },
        {
            action_code: ActionCode.CONFIRM_OFFER,
            text: "Hi {{first_name}}, could you share your decision on the offer? Best regards, {{recruiter}}",
        },
    ],
};

const NO_MODELS: AiModelRepoInterface = {
    list: async (): Promise<AiModelInterface[]> => [],
    replaceAll: async () => undefined,
};

const check = (raw: unknown) =>
    new AiService(
        NO_MODELS,
        {
            createCompletion: async () => ({
                output: raw,
                servedModel: null,
                inputTokens: null,
                outputTokens: null,
                costUsd: null,
            }),
            fetchModels: async () => [],
        },
        true
    ).generateText(FACTS, "test/model");

const withChange = (change: Partial<AiOutput>) => ({ ...VALID, ...change });
const problemsOf = async (raw: unknown) => (await check(raw)).problems;

beforeEach(() => jest.spyOn(console, "warn").mockImplementation(() => undefined));
afterEach(() => jest.restoreAllMocks());

describe("AiService answer check", () => {
    it("accepts a valid answer and trims it", async () => {
        expect((await check({ ...VALID, briefing: `  ${VALID.briefing}  ` })).output).toEqual(VALID);
    });

    it("names every field that is missing, wrong or unexpected (never the text)", async () => {
        expect(await problemsOf("just text")).toEqual(["the answer must be of type object"]);
        expect(await problemsOf({ briefing: "x" })).toEqual(["bottleneck_notes is required", "drafts is required"]);
        expect(
            await problemsOf({
                ...VALID,
                summary: "extra",
                drafts: [{ action: ActionCode.CONFIRM_OFFER, text: "Hi {{first_name}}." }, "Hi"],
            })
        ).toEqual([
            "drafts[0].action_code is required",
            "drafts[0].action is not allowed",
            "drafts[1] must be of type object",
            "drafts[1] contains a duplicate value",
            "summary is not allowed",
        ]);
    });

    it("puts the drafts in the order of the actions", async () => {
        expect((await check(withChange({ drafts: [VALID.drafts[1], VALID.drafts[0]] }))).output).toEqual(VALID);
    });

    it("rejects a missing, duplicate or invented action", async () => {
        expect(await problemsOf(withChange({ drafts: [VALID.drafts[0]] }))).toEqual(["drafts must contain 2 items"]);
        expect(await problemsOf(withChange({ drafts: [VALID.drafts[0], VALID.drafts[0], VALID.drafts[1]] }))).toEqual([
            "drafts[1] contains a duplicate value",
            "drafts must contain 2 items",
        ]);
        const invented = { action_code: ActionCode.CHASE_REFERENCES, text: "Hi {{first_name}}." };
        expect(await problemsOf(withChange({ drafts: [...VALID.drafts, invented] }))).toEqual([
            "drafts[2].action_code must be one of [REVIEW_APPLICATION, CONFIRM_OFFER]",
            "drafts must contain 2 items",
        ]);
    });

    it("rejects text that is too long", async () => {
        expect(await problemsOf(withChange({ briefing: "a".repeat(451) }))).toEqual([
            "briefing length must be less than or equal to 450 characters long",
        ]);
        const long = { action_code: ActionCode.CONFIRM_OFFER, text: "a".repeat(601) };
        expect(await problemsOf(withChange({ drafts: [VALID.drafts[0], long] }))).toEqual([
            "drafts[1].text length must be less than or equal to 600 characters long",
        ]);
    });

    it("rejects digits in drafts (no dates or day counts)", async () => {
        const drafts = [
            VALID.drafts[0],
            { action_code: ActionCode.CONFIRM_OFFER, text: "Hi {{first_name}}, please reply within 2 weeks." },
        ];
        expect(await problemsOf(withChange({ drafts }))).toEqual([
            "draft for CONFIRM_OFFER contains a digit (no dates or day counts in messages)",
        ]);
    });

    it.each(["by Friday", "by the end of next week", "in November", "tomorrow"])(
        'rejects a draft that promises a time ("%s")',
        async (timing) => {
            const drafts = [
                VALID.drafts[0],
                { action_code: ActionCode.CONFIRM_OFFER, text: `Hi {{first_name}}, please reply ${timing}.` },
            ];
            const problems = await problemsOf(withChange({ drafts }));
            expect(problems).toHaveLength(1);
            expect(problems[0]).toMatch(/^draft for CONFIRM_OFFER promises a time/);
        }
    );

    it("accepts the normal word may", async () => {
        const offer = {
            action_code: ActionCode.CONFIRM_OFFER,
            text: "Hi {{first_name}}, may I ask for your decision on the offer? Best regards, {{recruiter}}",
        };
        expect(await problemsOf(withChange({ drafts: [VALID.drafts[0], offer] }))).toEqual([]);
    });

    it("rejects a draft written to the wrong person", async () => {
        const toCandidate = {
            action_code: ActionCode.REVIEW_APPLICATION,
            text: "Hi {{first_name}}, we will review your application. Best, {{recruiter}}",
        };
        const toTeam = {
            action_code: ActionCode.CONFIRM_OFFER,
            text: "Hello, could you confirm the offer for {{name}}? Thanks, {{recruiter}}",
        };
        expect(await problemsOf(withChange({ drafts: [toCandidate, toTeam] }))).toEqual([
            "draft for REVIEW_APPLICATION is not for the candidate: name them as {{name}}, without {{first_name}}",
            "draft for CONFIRM_OFFER goes to the candidate: greet them as {{first_name}}, without {{name}}",
        ]);
    });

    it("rejects a draft that greets the sender", async () => {
        const greetsSender = {
            action_code: ActionCode.REVIEW_APPLICATION,
            text: "Hello {{recruiter}}, could you review {{name}}'s application? Thank you, {{recruiter}}",
        };
        expect(await problemsOf(withChange({ drafts: [greetsSender, VALID.drafts[1]] }))).toEqual([
            "draft for REVIEW_APPLICATION uses {{recruiter}} more than once (it is only for the signature)",
        ]);
    });

    it("rejects action codes instead of plain words", async () => {
        expect(await problemsOf(withChange({ briefing: "Start with rank 1: REVIEW_APPLICATION." }))).toEqual([
            "briefing uses the code REVIEW_APPLICATION instead of plain words",
        ]);
    });

    it("rejects numbers in the briefing that are not in the facts", async () => {
        expect(await problemsOf(withChange({ briefing: "About 25 candidates are stalled." }))).toEqual([
            "briefing uses the number 25, which is not in the facts",
        ]);
    });

    it.each([
        ["a link", "See https://example.com for details."],
        ["HTML", "Please <b>reply</b> soon."],
        ["a markdown link", "See [the board](board) first."],
    ])("rejects %s", async (_case, text) => {
        expect(await problemsOf(withChange({ briefing: text }))).toEqual(["briefing contains a link or markup"]);
    });

    it("rejects unknown or broken placeholders", async () => {
        const drafts = [
            { action_code: ActionCode.REVIEW_APPLICATION, text: "Hello {{last_name}}, about {{name}}, thanks." },
            { action_code: ActionCode.CONFIRM_OFFER, text: "Hi {{first_name}}, about {offer}, thanks." },
        ];
        expect(await problemsOf(withChange({ drafts }))).toEqual([
            "draft for REVIEW_APPLICATION uses an unknown placeholder {{last_name}}",
            "draft for CONFIRM_OFFER has a broken placeholder",
        ]);
    });

    it("turns a timeout into TIMEOUT and other errors into PROVIDER_ERROR", async () => {
        const failing = (error: Error) =>
            new AiService(
                NO_MODELS,
                {
                    createCompletion: async () => {
                        throw error;
                    },
                    fetchModels: async () => [],
                },
                true
            ).generateText(FACTS, "test/model");

        expect((await failing(new AxiosError("timeout", "ECONNABORTED"))).errorCode).toBe(AiErrorCode.TIMEOUT);
        expect((await failing(new Error("network down"))).errorCode).toBe(AiErrorCode.PROVIDER_ERROR);
    });

    it("needs one note per bottleneck", async () => {
        expect(await problemsOf(withChange({ bottleneck_notes: [] }))).toEqual([
            "bottleneck_notes must contain 1 items",
        ]);
    });
});
