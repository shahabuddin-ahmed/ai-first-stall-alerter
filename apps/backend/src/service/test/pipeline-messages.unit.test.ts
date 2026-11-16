import { ActionCode, RecipientType, TimerSource } from "../../constant/stage";
import { ACTIONS, explainReason, templateMessage, buildInsightFacts } from "../pipeline-messages";
import fs from "fs";
import path from "path";
import { AI_LIMITS } from "../../constant/ai";
import { analysePipeline } from "../pipeline-analysis";
import { parsePipelineCsv } from "../pipeline-csv";
import { PipelineAnalysis } from "../pipeline-types";
import { DEFAULT_STAGES } from "./default-stages";

describe("ACTIONS", () => {
    it("sends each message to whoever has to act", () => {
        expect(Object.fromEntries(Object.entries(ACTIONS).map(([code, action]) => [code, action.recipient]))).toEqual({
            REVIEW_APPLICATION: RecipientType.HIRING_MANAGER,
            SCHEDULE_SCREEN: RecipientType.CANDIDATE,
            REQUEST_FEEDBACK: RecipientType.INTERVIEW_PANEL,
            REVIEW_ASSESSMENT: RecipientType.ASSESSMENT_REVIEWER,
            CHASE_REFERENCES: RecipientType.CANDIDATE,
            CONFIRM_OFFER: RecipientType.CANDIDATE,
            GENERIC_FOLLOW_UP: RecipientType.CANDIDATE,
        });
    });
});

describe("explainReason", () => {
    const base = {
        name: "Hana Novak",
        stage: "Applied",
        recruiter: "Recruiter C",
        actionCode: ActionCode.REVIEW_APPLICATION,
        stageThreshold: 5,
        timerFrom: "2026-10-10",
        timerSource: TimerSource.STAGE_ENTERED,
    };

    it("explains a stall from the stage start", () => {
        expect(explainReason({ ...base, daysInStage: 34, overdueDays: 29 })).toBe(
            "Hana Novak has been in Applied for 34 days with no recorded activity. The Applied threshold is 5 days, " +
                "so the application is 29 days overdue. Recruiter C should review the application."
        );
    });

    it("explains a stall from the last activity", () => {
        expect(explainReason({ ...base, timerSource: TimerSource.LAST_ACTIVITY, daysInStage: 6, overdueDays: 1 })).toBe(
            "Hana Novak has had no activity in Applied since 2026-10-10 (6 days). The Applied threshold is 5 days, " +
                "so the application is 1 day overdue. Recruiter C should review the application."
        );
    });

    it("says 'due today' when the threshold is reached today", () => {
        expect(explainReason({ ...base, stageThreshold: 1, daysInStage: 1, overdueDays: 0 })).toContain(
            "The Applied threshold is 1 day, so the follow-up is due today."
        );
    });
});

describe("templateMessage", () => {
    const facts = { name: "Amara Okafor", firstName: "Amara", role: "Backend Engineer", recruiter: "Recruiter A" };

    it("addresses the candidate by first name", () => {
        expect(templateMessage(ActionCode.CONFIRM_OFFER, facts)).toBe(
            "Hi Amara, I am following up on the offer for the Backend Engineer position. " +
                "Please let me know your decision or any questions you have. Best regards, Recruiter A"
        );
    });

    it("addresses the hiring manager about the candidate", () => {
        expect(templateMessage(ActionCode.REVIEW_APPLICATION, facts)).toBe(
            "Hi, could you review Amara Okafor's application for the Backend Engineer role? " +
                "It needs a decision on the next step. Thanks, Recruiter A"
        );
    });

    it.each(Object.values(ActionCode))("%s makes no timing promises and has no unfilled placeholders", (code) => {
        const message = templateMessage(code, facts);
        expect(message).not.toMatch(/[{}]/);
        expect(message).not.toMatch(/\b(today|tomorrow|this week|soon|asap)\b/i);
    });
});

const DATA_DIR = path.resolve(__dirname, "../../../../../data");

const analyse = (bytes: Buffer): PipelineAnalysis => {
    const parsed = parsePipelineCsv(bytes);
    if (!parsed.ok) throw new Error(parsed.error.code);
    return analysePipeline(parsed.pipeline, DEFAULT_STAGES, "2026-11-13");
};

const sampleB = analyse(fs.readFileSync(path.join(DATA_DIR, "sample-b.csv")));

describe("buildInsightFacts", () => {
    it("sends exactly the allowed keys, nothing else", () => {
        const facts = buildInsightFacts(sampleB, 5);

        expect(Object.keys(facts).sort()).toEqual(["alerts", "board", "bottlenecks"]);
        expect(Object.keys(facts.board).sort()).toEqual([
            "invalid",
            "not_stalled",
            "on_hold",
            "stalled",
            "stalled_by_action",
            "stalled_by_other_recruiters",
            "stalled_by_recruiter",
            "terminal",
            "total",
            "valid",
        ]);
        facts.alerts.forEach((alert) =>
            expect(Object.keys(alert).sort()).toEqual([
                "action_code",
                "days_in_stage",
                "days_since_contact",
                "overdue_days",
                "rank",
                "recipient_type",
                "recruiter_key",
                "stage_threshold",
            ])
        );
    });

    it("never contains names, candidate IDs, roles, recruiter names, stage names or dates", () => {
        const text = JSON.stringify(buildInsightFacts(sampleB, 20));
        const forbidden = [
            ...sampleB.queue.flatMap((item) => [
                item.name,
                item.firstName,
                `"${item.candidateId}"`,
                item.role,
                item.recruiter,
            ]),
            ...DEFAULT_STAGES.map((stage) => `"${stage.name}"`),
            "2026-",
        ];

        forbidden.forEach((value) => expect(text).not.toContain(value));
    });

    it("keeps only the top N alerts, keyed by rank", () => {
        const facts = buildInsightFacts(sampleB, 5);

        expect(facts.alerts.map((alert) => alert.rank)).toEqual([1, 2, 3, 4, 5]);
        expect(facts.alerts[0]).toEqual({
            rank: 1,
            action_code: "REVIEW_APPLICATION",
            recipient_type: "hiring_manager",
            stage_threshold: 5,
            days_in_stage: 34,
            overdue_days: 29,
            days_since_contact: null,
            recruiter_key: "R1",
        });
    });

    it("describes bottlenecks by action code and recruiter key", () => {
        // Sample B: Offer (5) and Recruiter A (7)
        expect(buildInsightFacts(sampleB, 5).bottlenecks).toEqual([
            { type: "stage", action_code: "CONFIRM_OFFER", stalled: 5 },
            { type: "recruiter", recruiter_key: "R2", stalled: 7 },
        ]);
    });

    it(`stays under ${AI_LIMITS.MAX_PROMPT_BYTES} bytes for a 10,000-row pipeline`, () => {
        const rows = ["candidate_id,name,role,stage,stage_entered_at,recruiter"];
        for (let i = 0; i < 10_000; i += 1) {
            rows.push(`${i},Name ${i},Role ${i},Applied,2026-0${1 + (i % 9)}-15,Recruiter ${i % 40}`);
        }
        const facts = buildInsightFacts(analyse(Buffer.from(rows.join("\n"))), 20);

        expect(Buffer.byteLength(JSON.stringify(facts))).toBeLessThan(AI_LIMITS.MAX_PROMPT_BYTES);
        expect(facts.board.stalled_by_recruiter).toHaveLength(AI_LIMITS.TOP_RECRUITERS);
    });
});
