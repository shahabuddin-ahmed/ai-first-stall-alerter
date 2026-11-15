import { BOARD_LIMITS, FileErrorCode } from "../../constant/board";
import { parseBoardCsv } from "../csv-reader";
import { FileError, ParsedBoard } from "../types";

const HEADER = "candidate_id,name,role,stage,stage_entered_at,recruiter";
const ROW = "001,Ana Ruiz,QA Engineer,Applied,2026-11-01,Recruiter A";

const parse = (text: string | Buffer): ParsedBoard => {
    const result = parseBoardCsv(typeof text === "string" ? Buffer.from(text, "utf8") : text);
    if (!result.ok) {
        throw new Error(`unexpected file error ${result.error.code}`);
    }
    return result.board;
};

const fileError = (text: string | Buffer): FileError => {
    const result = parseBoardCsv(typeof text === "string" ? Buffer.from(text, "utf8") : text);
    if (result.ok) {
        throw new Error("expected a file error");
    }
    return result.error;
};

describe("parseBoardCsv: reading records", () => {
    it("reads a simple file, numbering records with the header as 1", () => {
        const board = parse(`${HEADER}\n${ROW}\n`);

        expect(board.headerCount).toBe(6);
        expect(board.records).toEqual([
            {
                recordNumber: 2, fieldCount: 6, candidateId: "001", name: "Ana Ruiz", role: "QA Engineer",
                stage: "Applied", stageEnteredAt: "2026-11-01", recruiter: "Recruiter A",
                lastActivityAt: "", lastContactedAt: "",
            },
        ]);
    });

    it("removes a UTF-8 BOM", () => {
        const board = parse(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(`${HEADER}\n${ROW}`)]));
        expect(board.records[0].candidateId).toBe("001");
    });

    it("accepts Windows line endings (CRLF)", () => {
        const board = parse(`${HEADER}\r\n${ROW}\r\n${ROW.replace("001", "002")}\r\n`);
        expect(board.records.map((record) => record.candidateId)).toEqual(["001", "002"]);
    });

    it("keeps commas and quotes inside quoted values", () => {
        const board = parse(`${HEADER}\n001,"Lopes, Ana","QA ""Lead""",Applied,2026-11-01,Recruiter A`);
        expect(board.records[0].name).toBe("Lopes, Ana");
        expect(board.records[0].role).toBe('QA "Lead"');
    });

    it("trims headers and values, accepts any column order and ignores extra columns", () => {
        const board = parse(
            " recruiter , notes ,stage,candidate_id,name,role,stage_entered_at,last_activity_at\n" +
            " Recruiter A ,private note, Offer , 0142 ,Wei Zhang,Data Analyst,2026-11-05,2026-11-06"
        );

        expect(board.headerCount).toBe(8);
        expect(board.records[0]).toMatchObject({
            candidateId: "0142", recruiter: "Recruiter A", stage: "Offer", lastActivityAt: "2026-11-06",
        });
        expect(JSON.stringify(board.records[0])).not.toContain("private note");
    });

    it("skips blank records but keeps the record numbers of the file", () => {
        const board = parse(`${HEADER}\n${ROW}\n\n,,,,,\n${ROW.replace("001", "002")}`);
        expect(board.records.map((record) => record.recordNumber)).toEqual([2, 5]);
    });

    it("keeps records with the wrong number of fields (they become row errors later)", () => {
        const board = parse(`${HEADER}\n141,Rosa Lopez,QA Engineer, Mobile,Interview,2026-11-01,Recruiter C`);
        expect(board.records[0]).toMatchObject({ recordNumber: 2, fieldCount: 7, candidateId: "141" });
    });
});

describe("parseBoardCsv: file errors", () => {
    it("rejects an empty file", () => {
        expect(fileError("").code).toBe(FileErrorCode.EMPTY_FILE);
        expect(fileError(" \n \n").code).toBe(FileErrorCode.EMPTY_FILE);
    });

    it("rejects a file with a header but no candidates", () => {
        expect(fileError(`${HEADER}\n\n`).code).toBe(FileErrorCode.EMPTY_FILE);
    });

    it("rejects a file that is not UTF-8", () => {
        expect(fileError(Buffer.from([0x63, 0x61, 0xff, 0xfe, 0x0a])).code).toBe(FileErrorCode.INVALID_ENCODING);
    });

    it("lists the missing required headers", () => {
        const error = fileError("candidate_id,name,role\n001,Ana,QA");
        expect(error.code).toBe(FileErrorCode.MISSING_HEADERS);
        expect(error.details).toEqual(["stage", "stage_entered_at", "recruiter"]);
    });

    it("does not match headers with different capitals", () => {
        expect(fileError(`Candidate_ID,name,role,stage,stage_entered_at,recruiter\n${ROW}`).details).toEqual(["candidate_id"]);
    });

    it("rejects duplicate headers", () => {
        const error = fileError(`${HEADER},stage\n${ROW},Offer`);
        expect(error.code).toBe(FileErrorCode.DUPLICATE_HEADERS);
        expect(error.details).toEqual(["stage"]);
    });

    it("rejects broken CSV and says where", () => {
        const error = fileError(`${HEADER}\n${ROW}\n002,"Unclosed,QA,Applied,2026-11-01,Recruiter A\n`);
        expect(error.code).toBe(FileErrorCode.INVALID_CSV);
        expect(error.message).toMatch(/line \d+/);
    });

    it("rejects more than 10,000 candidate records", () => {
        const rows = Array.from({ length: BOARD_LIMITS.MAX_RECORDS + 1 }, (_, i) => ROW.replace("001", String(i)));
        expect(fileError(`${HEADER}\n${rows.join("\n")}`).code).toBe(FileErrorCode.TOO_MANY_ROWS);
    });

    it("accepts exactly 10,000 records", () => {
        const rows = Array.from({ length: BOARD_LIMITS.MAX_RECORDS }, (_, i) => ROW.replace("001", String(i)));
        expect(parse(`${HEADER}\n${rows.join("\n")}`).records).toHaveLength(BOARD_LIMITS.MAX_RECORDS);
    });

    it("rejects a value longer than 255 characters in a known column", () => {
        const error = fileError(`${HEADER}\n001,${"x".repeat(256)},QA,Applied,2026-11-01,Recruiter A`);
        expect(error.code).toBe(FileErrorCode.VALUE_TOO_LONG);
        expect(error.details).toEqual(["record 2, column name"]);
    });

    it("ignores long values in columns it does not store", () => {
        expect(parse(`${HEADER},notes\n${ROW},${"x".repeat(1000)}`).records).toHaveLength(1);
    });
});
