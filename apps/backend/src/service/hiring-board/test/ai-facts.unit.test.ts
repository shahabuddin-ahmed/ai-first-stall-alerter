import fs from "fs";
import path from "path";
import { AI_LIMITS } from "../../../constant/ai";
import { buildInsightFacts } from "../ai-facts";
import { analyseBoard } from "../analyse-board";
import { parseBoardCsv } from "../csv-reader";
import { BoardAnalysis } from "../types";
import { DEFAULT_STAGES } from "./default-stages";

const DATA_DIR = path.resolve(__dirname, "../../../../../../data");

const analyse = (bytes: Buffer): BoardAnalysis => {
    const parsed = parseBoardCsv(bytes);
    if (!parsed.ok) throw new Error(parsed.error.code);
    return analyseBoard(parsed.board, DEFAULT_STAGES, "2026-11-13");
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

    it(`stays under ${AI_LIMITS.MAX_PROMPT_BYTES} bytes for a 10,000-row board`, () => {
        const rows = ["candidate_id,name,role,stage,stage_entered_at,recruiter"];
        for (let i = 0; i < 10_000; i += 1) {
            rows.push(`${i},Name ${i},Role ${i},Applied,2026-0${1 + (i % 9)}-15,Recruiter ${i % 40}`);
        }
        const facts = buildInsightFacts(analyse(Buffer.from(rows.join("\n"))), 20);

        expect(Buffer.byteLength(JSON.stringify(facts))).toBeLessThan(AI_LIMITS.MAX_PROMPT_BYTES);
        expect(facts.board.stalled_by_recruiter).toHaveLength(AI_LIMITS.TOP_RECRUITERS);
    });
});
