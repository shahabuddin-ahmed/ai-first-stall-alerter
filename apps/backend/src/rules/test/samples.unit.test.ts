import fs from "fs";
import path from "path";
import { StageType } from "../../constant/stage";
import { analyseBoard } from "../analyse-board";
import { parseBoardCsv } from "../csv-reader";
import { DEFAULT_STAGES } from "./default-stages";
import { BoardAnalysis, StageConfig } from "../types";

// The app must give exactly the same answers as scripts/generate_expected.py,
// which was written separately (Python). Never edit data/expected/*.json by hand.
const DATA_DIR = path.resolve(__dirname, "../../../../../data");
const REFERENCE_DATE = "2026-11-13";

const SCENARIOS: Record<string, StageConfig[]> = {
    default_stages: DEFAULT_STAGES,
    all_thresholds_7: DEFAULT_STAGES.map((stage) =>
        stage.type === StageType.WATCHED ? { ...stage, thresholdDays: 7 } : stage
    ),
};

const analyseSample = (sample: string, stages: StageConfig[]): BoardAnalysis => {
    const parsed = parseBoardCsv(fs.readFileSync(path.join(DATA_DIR, `${sample}.csv`)));
    if (!parsed.ok) {
        throw new Error(`${sample} was rejected: ${parsed.error.code}`);
    }
    return analyseBoard(parsed.board, stages, REFERENCE_DATE);
};

// The app's result in the expected file's shape.
const toExpectedShape = (result: BoardAnalysis) => ({
    reference_date: result.referenceDate,
    counts: {
        total: result.counts.total,
        valid: result.counts.valid,
        invalid: result.counts.invalid,
        terminal: result.counts.terminal,
        on_hold: result.counts.onHold,
        stalled: result.counts.stalled,
        not_stalled: result.counts.notStalled,
    },
    row_errors: result.rowErrors.map((row) => ({
        record: row.recordNumber,
        candidate_id: row.candidateId,
        errors: row.errors.map((error) => ({ field: error.field, problem: error.problem })),
    })),
    queue: result.queue.map((item) => ({
        candidate_id: item.candidateId,
        name: item.name,
        stage: item.stage,
        recruiter: item.recruiter,
        timer_from: item.timerFrom,
        days_in_stage: item.daysInStage,
        stage_threshold: item.stageThreshold,
        overdue_days: item.overdueDays,
        action_code: item.actionCode,
        days_since_contact: item.daysSinceContact,
        rank: item.rank,
    })),
    bottlenecks: result.bottlenecks,
});

describe.each(["sample-a", "sample-b", "sample-c"])("%s matches the expected results", (sample) => {
    const expected = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "expected", `${sample}.json`), "utf8"));

    it.each(Object.keys(SCENARIOS))("scenario %s", (scenario) => {
        const { stages: _setup, ...want } = expected.scenarios[scenario];

        expect(toExpectedShape(analyseSample(sample, SCENARIOS[scenario]))).toEqual(want);
    });
});

describe("headline results (spec Part D)", () => {
    it("Sample B with default stages: 43 records, 11 invalid, 18 stalled, Offer and Recruiter A bottlenecks", () => {
        const result = analyseSample("sample-b", DEFAULT_STAGES);

        expect(result.counts).toEqual({
            total: 43,
            valid: 32,
            invalid: 11,
            terminal: 5,
            onHold: 0,
            stalled: 18,
            notStalled: 9,
        });
        expect(result.queue.map((item) => item.candidateId)).toEqual([
            "127",
            "104",
            "108",
            "101",
            "125",
            "0142",
            "122",
            "137",
            "110",
            "135",
            "105",
            "114",
            "124",
            "131",
            "121",
            "111",
            "103",
            "139",
        ]);
        expect(result.rowErrors.map((row) => row.recordNumber)).toEqual([3, 16, 17, 19, 20, 21, 27, 29, 30, 37, 42]);
        expect(result.bottlenecks).toEqual([
            { type: "stage", key: "Offer", stalled: 5 },
            { type: "recruiter", key: "Recruiter A", stalled: 7 },
        ]);
    });

    it("Sample C: last_activity_at restarts the timer, On hold is counted, never queued", () => {
        const result = analyseSample("sample-c", DEFAULT_STAGES);

        expect(result.counts.onHold).toBe(1);
        expect(result.queue.map((item) => item.candidateId)).toEqual(["c02", "c03", "c08"]);
        // c08 entered Interview on 2026-10-01 but had activity on 2026-10-25
        expect(result.queue.find((item) => item.candidateId === "c08")).toMatchObject({
            timerFrom: "2026-10-25",
            timerSource: "last_activity_at",
            stage: "Interview",
        });
    });
});
