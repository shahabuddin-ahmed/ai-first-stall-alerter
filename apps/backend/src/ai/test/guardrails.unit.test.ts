import { ActionCode, RecipientType } from "../../constant/stage";
import { InsightFacts } from "../../rules/ai-facts";
import { AiOutput, checkAiOutput } from "../guardrails";
import { BottleneckType } from "../../constant/board";

const FACTS: InsightFacts = {
    board: {
        total: 43, valid: 32, invalid: 11, terminal: 5, on_hold: 0, stalled: 18, not_stalled: 9,
        stalled_by_action: { REVIEW_APPLICATION: 5, CONFIRM_OFFER: 5 },
        stalled_by_recruiter: [{ recruiter_key: "R1", stalled: 7 }],
        stalled_by_other_recruiters: 11,
    },
    bottlenecks: [{ type: BottleneckType.STAGE, action_code: ActionCode.CONFIRM_OFFER, stalled: 5 }],
    alerts: [1, 2].map((rank) => ({
        rank, action_code: ActionCode.CONFIRM_OFFER, recipient_type: RecipientType.CANDIDATE, stage_threshold: 3,
        days_in_stage: 10, overdue_days: 7, days_since_contact: null, recruiter_key: "R1",
    })),
};

const VALID: AiOutput = {
    briefing: "18 candidates are stalled. Start with rank 1 and rank 2; R1 owns 7 follow-ups.",
    bottleneck_notes: ["Offers are piling up: 5 are waiting for a decision. Confirm them first."],
    drafts: [
        { rank: 1, text: "Hi {{first_name}}, I am following up on the offer for the {{role}} position. Best regards, {{recruiter}}" },
        { rank: 2, text: "Hi {{first_name}}, could you share your decision on the offer? Best regards, {{recruiter}}" },
    ],
};

const withChange = (change: Partial<AiOutput>) => ({ ...VALID, ...change });
const problemsOf = (raw: unknown) => {
    const result = checkAiOutput(raw, FACTS);
    return result.ok ? [] : result.problems;
};

describe("checkAiOutput", () => {
    it("accepts a valid answer and trims it", () => {
        const result = checkAiOutput({ ...VALID, briefing: `  ${VALID.briefing}  ` }, FACTS);
        expect(result).toEqual({ ok: true, output: VALID });
    });

    it("rejects an answer without the expected fields", () => {
        expect(problemsOf("just text")).toEqual(["the answer does not have the expected fields"]);
        expect(problemsOf({ briefing: "x" })).toEqual(["the answer does not have the expected fields"]);
    });

    it("rejects a missing, duplicate or invented rank", () => {
        expect(problemsOf(withChange({ drafts: [VALID.drafts[0]] }))).toEqual(["rank 2 has no draft"]);
        expect(problemsOf(withChange({ drafts: [VALID.drafts[0], VALID.drafts[0], VALID.drafts[1]] }))).toEqual([
            "a rank has more than one draft",
        ]);
        expect(problemsOf(withChange({ drafts: [...VALID.drafts, { rank: 9, text: "Hi {{first_name}}." }] }))).toEqual([
            "rank 9 was not requested",
        ]);
    });

    it("rejects text that is too long", () => {
        expect(problemsOf(withChange({ briefing: "a".repeat(451) }))).toEqual(["briefing is longer than 450 characters"]);
        expect(problemsOf(withChange({ drafts: [VALID.drafts[0], { rank: 2, text: "a".repeat(601) }] }))).toEqual([
            "draft for rank 2 is longer than 600 characters",
        ]);
    });

    it("rejects digits in drafts (no dates or day counts)", () => {
        const drafts = [VALID.drafts[0], { rank: 2, text: "Hi {{first_name}}, please reply by 20 November." }];
        expect(problemsOf(withChange({ drafts }))).toEqual(["draft for rank 2 contains a digit (no dates or day counts in messages)"]);
    });

    it("rejects numbers in the briefing that are not in the facts", () => {
        expect(problemsOf(withChange({ briefing: "About 25 candidates are stalled." }))).toEqual([
            "briefing uses the number 25, which is not in the facts",
        ]);
    });

    it.each([
        ["a link", "See https://example.com for details."],
        ["HTML", "Please <b>reply</b> soon."],
        ["a markdown link", "See [the board](board) first."],
    ])("rejects %s", (_case, text) => {
        expect(problemsOf(withChange({ briefing: text }))).toEqual(["briefing contains a link or markup"]);
    });

    it("rejects unknown or broken placeholders", () => {
        const drafts = [{ rank: 1, text: "Hi {{last_name}}, thanks." }, { rank: 2, text: "Hi {first_name}, thanks." }];
        expect(problemsOf(withChange({ drafts }))).toEqual([
            "draft for rank 1 uses an unknown placeholder {{last_name}}",
            "draft for rank 2 has a broken placeholder",
        ]);
    });

    it("needs one note per bottleneck", () => {
        expect(problemsOf(withChange({ bottleneck_notes: [] }))).toEqual(["expected 1 bottleneck notes, got 0"]);
    });
});
