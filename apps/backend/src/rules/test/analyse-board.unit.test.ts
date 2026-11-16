import fs from "fs";
import path from "path";
import { RowErrorCode } from "../../constant/board";
import { TimerSource } from "../../constant/stage";
import { analyseBoard } from "../analyse-board";
import { parseBoardCsv } from "../csv-reader";
import { DEFAULT_STAGES } from "./default-stages";
import { BoardAnalysis, ParsedBoard } from "../types";

const HEADER = "candidate_id,name,role,stage,stage_entered_at,recruiter,last_activity_at,last_contacted_at";
const REFERENCE_DATE = "2026-11-13";

const board = (...rows: string[]): ParsedBoard => {
    const result = parseBoardCsv(Buffer.from([HEADER, ...rows].join("\n")));
    if (!result.ok) {
        throw new Error(result.error.code);
    }
    return result.board;
};

const analyse = (...rows: string[]): BoardAnalysis => analyseBoard(board(...rows), DEFAULT_STAGES, REFERENCE_DATE);

describe("stall rule", () => {
    it("is stalled on the threshold day with 0 days overdue, not the day before", () => {
        // Offer threshold = 3 days
        const result = analyse(
            "001,Ana Ruiz,QA,Offer,2026-11-10,Recruiter A,,",
            "002,Ben Okoro,QA,Offer,2026-11-11,Recruiter A,,"
        );

        expect(result.queue.map((item) => [item.candidateId, item.daysInStage, item.overdueDays])).toEqual([
            ["001", 3, 0],
        ]);
        expect(result.counts.notStalled).toBe(1);
    });

    it("starts the timer at last_activity_at when it is later than stage_entered_at", () => {
        const [item] = analyse("001,Ana Ruiz,QA,Offer,2026-11-01,Recruiter A,2026-11-09,").queue;
        expect(item).toMatchObject({ timerFrom: "2026-11-09", timerSource: TimerSource.LAST_ACTIVITY, daysInStage: 4 });
    });

    it("ignores an activity date before the stage started (it belongs to an older stage)", () => {
        const [item] = analyse("001,Ana Ruiz,QA,Offer,2026-11-05,Recruiter A,2026-11-01,").queue;
        expect(item).toMatchObject({ timerFrom: "2026-11-05", timerSource: TimerSource.STAGE_ENTERED, daysInStage: 8 });
    });

    it("never restarts the timer on contact (contact is not progress)", () => {
        const [item] = analyse("001,Ana Ruiz,QA,Offer,2026-11-01,Recruiter A,,2026-11-12").queue;
        expect(item).toMatchObject({ daysInStage: 12, daysSinceContact: 1, lastContactedAt: "2026-11-12" });
    });

    it("never queues paused or final stages", () => {
        const result = analyse(
            "001,Ana Ruiz,QA,On hold,2026-01-01,Recruiter A,,",
            "002,Ben Okoro,QA,Hired,2026-01-01,Recruiter A,,",
            "003,Cy Lam,QA,declined,2026-01-01,Recruiter A,,"
        );
        expect(result.queue).toEqual([]);
        expect(result.counts).toMatchObject({ onHold: 1, terminal: 2, stalled: 0 });
    });

    it("matches stage names and aliases ignoring case and extra spaces", () => {
        const result = analyse("001,Ana Ruiz,QA,  PANEL   interview ,2026-10-01,Recruiter A,,");
        expect(result.queue[0].stage).toBe("Interview");
    });
});

describe("ranking", () => {
    it("orders by overdue days, then later stage, then candidate ID", () => {
        const result = analyse(
            "b2,Ana Ruiz,QA,Applied,2026-11-03,Recruiter A,,", // Applied 5: 10 days → 5 overdue
            "a1,Ben Okoro,QA,Offer,2026-11-05,Recruiter A,,", // Offer 3: 8 days → 5 overdue, later stage
            "b1,Cy Lam,QA,Applied,2026-11-03,Recruiter A,,", // same as b2, lower ID
            "z9,Di Park,QA,Offer,2026-10-01,Recruiter A,," // most overdue
        );
        expect(result.queue.map((item) => [item.rank, item.candidateId])).toEqual([
            [1, "z9"],
            [2, "a1"],
            [3, "b1"],
            [4, "b2"],
        ]);
    });

    it("does not depend on the row order in the file", () => {
        const sampleB = parseBoardCsv(fs.readFileSync(path.resolve(__dirname, "../../../../../data/sample-b.csv")));
        if (!sampleB.ok) {
            throw new Error("sample B rejected");
        }
        const reversed = { ...sampleB.board, records: [...sampleB.board.records].reverse() };

        const ids = (b: ParsedBoard) => analyseBoard(b, DEFAULT_STAGES, REFERENCE_DATE).queue.map((i) => i.candidateId);
        expect(ids(reversed)).toEqual(ids(sampleB.board));
    });

    it("compares IDs by plain character codes (uppercase before lowercase)", () => {
        const result = analyse(
            "b,Ana Ruiz,QA,Offer,2026-11-01,Recruiter A,,",
            "B,Ben Okoro,QA,Offer,2026-11-01,Recruiter A,,"
        );
        expect(result.queue.map((item) => item.candidateId)).toEqual(["B", "b"]);
    });
});

describe("row errors", () => {
    it("treats IDs as case-sensitive text, so 'abc' and 'ABC' are not duplicates", () => {
        const result = analyse(
            "abc,Ana Ruiz,QA,Offer,2026-11-01,Recruiter A,,",
            "ABC,Ben Okoro,QA,Offer,2026-11-01,Recruiter A,,"
        );
        expect(result.rowErrors).toEqual([]);
    });

    it("lists every problem of a record but counts the record once", () => {
        const result = analyse(",Ana Ruiz,,Offer,2026-02-30,Recruiter A,2026-12-01,");

        expect(result.counts.invalid).toBe(1);
        expect(result.rowErrors[0].errors.map((error) => [error.field, error.code])).toEqual([
            ["candidate_id", RowErrorCode.MISSING_VALUE],
            ["role", RowErrorCode.MISSING_VALUE],
            ["stage_entered_at", RowErrorCode.INVALID_DATE],
            ["last_activity_at", RowErrorCode.FUTURE_DATE],
        ]);
    });

    it("marks every copy of a duplicate ID", () => {
        const result = analyse(
            "001,Ana Ruiz,QA,Offer,2026-11-01,Recruiter A,,",
            "002,Ben Okoro,QA,Offer,2026-11-01,Recruiter A,,",
            "001,Ana Ruiz,QA,Interview,2026-11-01,Recruiter A,,"
        );
        expect(result.rowErrors.map((row) => [row.recordNumber, row.errors[0].problem])).toEqual([
            [2, "duplicate ID (also record 4)"],
            [4, "duplicate ID (also record 2)"],
        ]);
    });

    it("explains an unknown stage", () => {
        const [row] = analyse("001,Ana Ruiz,QA,Technical Test,2026-11-01,Recruiter A,,").rowErrors;
        expect(row.errors).toEqual([
            {
                field: "stage",
                code: RowErrorCode.UNKNOWN_STAGE,
                problem: '"Technical Test" is not in your hiring stages',
            },
        ]);
    });
});

describe("reference date", () => {
    it("an earlier reference date makes applications younger", () => {
        const result = analyseBoard(
            board("001,Ana Ruiz,QA,Offer,2026-11-01,Recruiter A,,"),
            DEFAULT_STAGES,
            "2026-11-02"
        );
        expect(result.queue).toEqual([]);
        expect(result.counts.notStalled).toBe(1);
    });
});

describe("bottlenecks", () => {
    it("shows nothing when no stage or recruiter has 2 or more stalled", () => {
        const result = analyse("001,Ana Ruiz,QA,Offer,2026-11-01,Recruiter A,,");
        expect(result.bottlenecks).toEqual([]);
    });

    it("breaks ties by the later stage and by recruiter name", () => {
        const result = analyse(
            "001,Ana Ruiz,QA,Applied,2026-10-01,Recruiter B,,",
            "002,Ben Okoro,QA,Applied,2026-10-01,Recruiter A,,",
            "003,Cy Lam,QA,Offer,2026-10-01,Recruiter B,,",
            "004,Di Park,QA,Offer,2026-10-01,Recruiter A,,"
        );
        expect(result.bottlenecks).toEqual([
            { type: "stage", key: "Offer", stalled: 2 },
            { type: "recruiter", key: "Recruiter A", stalled: 2 },
        ]);
    });
});
