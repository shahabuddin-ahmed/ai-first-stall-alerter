import { ExportColumn, EXPORT_COLUMNS } from "../../constant/export";
import { buildExportCsv, ExportRow, guardFormula } from "../export-csv";

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
