import { PIPELINE_LIMITS, FileErrorCode } from "../../constant/pipeline";
import { parsePipelineCsv, buildExportCsv, ExportRow, guardFormula } from "../pipeline-csv";
import { FileError, ParsedPipeline } from "../pipeline-types";
import { ExportColumn, EXPORT_COLUMNS } from "../../constant/export";

const HEADER = "candidate_id,name,role,stage,stage_entered_at,recruiter";
const ROW = "001,Ana Ruiz,QA Engineer,Applied,2026-11-01,Recruiter A";

const parse = (text: string | Buffer): ParsedPipeline => {
    const result = parsePipelineCsv(typeof text === "string" ? Buffer.from(text, "utf8") : text);
    if (!result.ok) {
        throw new Error(`unexpected file error ${result.error.code}`);
    }
    return result.pipeline;
};

const fileError = (text: string | Buffer): FileError => {
    const result = parsePipelineCsv(typeof text === "string" ? Buffer.from(text, "utf8") : text);
    if (result.ok) {
        throw new Error("expected a file error");
    }
    return result.error;
};

describe("parsePipelineCsv: reading records", () => {
    it("reads a simple file, numbering records with the header as 1", () => {
        const pipeline = parse(`${HEADER}\n${ROW}\n`);

        expect(pipeline.headerCount).toBe(6);
        expect(pipeline.records).toEqual([
            {
                recordNumber: 2,
                fieldCount: 6,
                candidateId: "001",
                name: "Ana Ruiz",
                role: "QA Engineer",
                stage: "Applied",
                stageEnteredAt: "2026-11-01",
                recruiter: "Recruiter A",
                lastActivityAt: "",
                lastContactedAt: "",
            },
        ]);
    });

    it("removes a UTF-8 BOM", () => {
        const pipeline = parse(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(`${HEADER}\n${ROW}`)]));
        expect(pipeline.records[0].candidateId).toBe("001");
    });

    it("accepts Windows line endings (CRLF)", () => {
        const pipeline = parse(`${HEADER}\r\n${ROW}\r\n${ROW.replace("001", "002")}\r\n`);
        expect(pipeline.records.map((record) => record.candidateId)).toEqual(["001", "002"]);
    });

    it("keeps commas and quotes inside quoted values", () => {
        const pipeline = parse(`${HEADER}\n001,"Lopes, Ana","QA ""Lead""",Applied,2026-11-01,Recruiter A`);
        expect(pipeline.records[0].name).toBe("Lopes, Ana");
        expect(pipeline.records[0].role).toBe('QA "Lead"');
    });

    it("trims headers and values, accepts any column order and ignores extra columns", () => {
        const pipeline = parse(
            " recruiter , notes ,stage,candidate_id,name,role,stage_entered_at,last_activity_at\n" +
                " Recruiter A ,private note, Offer , 0142 ,Wei Zhang,Data Analyst,2026-11-05,2026-11-06"
        );

        expect(pipeline.headerCount).toBe(8);
        expect(pipeline.records[0]).toMatchObject({
            candidateId: "0142",
            recruiter: "Recruiter A",
            stage: "Offer",
            lastActivityAt: "2026-11-06",
        });
        expect(JSON.stringify(pipeline.records[0])).not.toContain("private note");
    });

    it("trims spaces inside quotes too, in headers and values", () => {
        const pipeline = parse(
            '" candidate_id ",name,role," stage ",stage_entered_at,recruiter\n' +
                '" 0142 "," Wei Zhang ",Data Analyst," Applied ",2026-11-05," Recruiter A "\n' +
                '"   ",Ana Ruiz,QA Engineer,Applied,2026-11-01,Recruiter A'
        );

        expect(pipeline.records[0]).toMatchObject({
            candidateId: "0142",
            name: "Wei Zhang",
            stage: "Applied",
            recruiter: "Recruiter A",
        });
        expect(pipeline.records[1].candidateId).toBe("");
    });

    it("skips blank records but keeps the record numbers of the file", () => {
        const pipeline = parse(`${HEADER}\n${ROW}\n\n,,,,,\n${ROW.replace("001", "002")}`);
        expect(pipeline.records.map((record) => record.recordNumber)).toEqual([2, 5]);
    });

    it("keeps records with the wrong number of fields (they become row errors later)", () => {
        const pipeline = parse(`${HEADER}\n141,Rosa Lopez,QA Engineer, Mobile,Interview,2026-11-01,Recruiter C`);
        expect(pipeline.records[0]).toMatchObject({ recordNumber: 2, fieldCount: 7, candidateId: "141" });
    });
});

describe("parsePipelineCsv: file errors", () => {
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
        expect(fileError(`Candidate_ID,name,role,stage,stage_entered_at,recruiter\n${ROW}`).details).toEqual([
            "candidate_id",
        ]);
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
        const rows = Array.from({ length: PIPELINE_LIMITS.MAX_RECORDS + 1 }, (_, i) => ROW.replace("001", String(i)));
        expect(fileError(`${HEADER}\n${rows.join("\n")}`).code).toBe(FileErrorCode.TOO_MANY_ROWS);
    });

    it("accepts exactly 10,000 records", () => {
        const rows = Array.from({ length: PIPELINE_LIMITS.MAX_RECORDS }, (_, i) => ROW.replace("001", String(i)));
        expect(parse(`${HEADER}\n${rows.join("\n")}`).records).toHaveLength(PIPELINE_LIMITS.MAX_RECORDS);
    });

    it("rejects a name longer than 50 characters, and accepts exactly 50", () => {
        const error = fileError(`${HEADER}\n001,${"x".repeat(51)},QA,Applied,2026-11-01,Recruiter A`);
        expect(error.code).toBe(FileErrorCode.VALUE_TOO_LONG);
        expect(error.details).toEqual(["record 2, column name (max 50)"]);
        expect(parse(`${HEADER}\n001,${"x".repeat(50)},QA,Applied,2026-11-01,Recruiter A`).records).toHaveLength(1);
    });

    it("checks each text column against its own limit", () => {
        const error = fileError(
            `${HEADER}\n${"1".repeat(37)},Ana,${"r".repeat(51)},${"s".repeat(31)},2026-11-01,${"p".repeat(51)}`
        );
        expect(error.details).toEqual([
            "record 2, column candidate_id (max 36)",
            "record 2, column role (max 50)",
            "record 2, column stage (max 30)",
            "record 2, column recruiter (max 50)",
        ]);
    });

    it("ignores long values in columns it does not store", () => {
        expect(parse(`${HEADER},notes\n${ROW},${"x".repeat(1000)}`).records).toHaveLength(1);
    });
});

const row = (change: Partial<ExportRow> = {}): ExportRow => ({
    ...(Object.fromEntries(EXPORT_COLUMNS.map((column) => [column, ""])) as ExportRow),
    [ExportColumn.RANK]: 1,
    [ExportColumn.CANDIDATE_ID]: "0142",
    [ExportColumn.NAME]: "Wei Zhang",
    ...change,
});

const lines = (csv: string) => csv.replace(/^\uFEFF/, "").split("\r\n");

describe("guardFormula", () => {
    it.each(["=SUM(A1:A9)", "+1", "-1", "@cmd", "\tTab", "\rReturn"])("puts ' in front of %j", (value) => {
        expect(guardFormula(value)).toBe(`'${value}`);
    });

    it("leaves normal text alone", () => {
        expect(guardFormula("Hana Novak")).toBe("Hana Novak");
        expect(guardFormula("a=b")).toBe("a=b");
    });
});

describe("buildExportCsv", () => {
    it("starts with a UTF-8 BOM (Excel) and the header in spec order, with Windows line endings", () => {
        const csv = buildExportCsv([]);

        expect(csv.startsWith("\uFEFF")).toBe(true);
        expect(lines(csv)[0]).toBe(
            "rank,candidate_id,name,role,stage,recruiter,reference_date,stage_threshold,timer_from,days_in_stage," +
                "overdue_days,reason,action,message_to,message_draft,message_source,ai_note_status"
        );
        expect(csv.endsWith("\r\n")).toBe(true);
    });

    it("keeps leading zeros and writes numbers as numbers", () => {
        expect(lines(buildExportCsv([row()]))[1]).toMatch(/^1,0142,Wei Zhang,/);
    });

    it("quotes values with commas, quotes or line breaks (RFC 4180)", () => {
        const csv = buildExportCsv([
            row({ [ExportColumn.NAME]: "Lopes, Ana", [ExportColumn.REASON]: 'She said "soon"\nthen nothing' }),
        ]);

        expect(csv).toContain('"Lopes, Ana"');
        expect(csv).toContain('"She said ""soon""\nthen nothing"');
    });

    it("guards formulas in text cells, even inside quotes", () => {
        const csv = buildExportCsv([row({ [ExportColumn.NAME]: '=HYPERLINK("http://x","click")' })]);

        expect(csv).toContain(`"'=HYPERLINK(""http://x"",""click"")"`);
    });

    it("writes empty values as empty cells", () => {
        expect(lines(buildExportCsv([row({ [ExportColumn.ROLE]: null })]))[1]).toMatch(/^1,0142,Wei Zhang,,/);
    });
});
