import { parse } from "csv-parse/sync";
import {
    PIPELINE_LIMITS,
    PipelineColumn,
    FileErrorCode,
    KNOWN_COLUMNS,
    REQUIRED_COLUMNS,
    TEXT_COLUMN_LIMITS,
} from "../constant/pipeline";
import { PipelineRecord, FileError, ParseResult } from "./pipeline-types";
import { CSV_BOM, CSV_LINE_END, EXPORT_COLUMNS, ExportColumn, FORMULA_START } from "../constant/export";

export const COLUMN_FIELDS: Record<PipelineColumn, keyof PipelineRecord> = {
    [PipelineColumn.CANDIDATE_ID]: "candidateId",
    [PipelineColumn.NAME]: "name",
    [PipelineColumn.ROLE]: "role",
    [PipelineColumn.STAGE]: "stage",
    [PipelineColumn.STAGE_ENTERED_AT]: "stageEnteredAt",
    [PipelineColumn.RECRUITER]: "recruiter",
    [PipelineColumn.LAST_ACTIVITY_AT]: "lastActivityAt",
    [PipelineColumn.LAST_CONTACTED_AT]: "lastContactedAt",
};

const fail = (code: FileErrorCode, message: string, details: string[] = []): ParseResult => ({
    ok: false,
    error: { code, message, details: details.slice(0, PIPELINE_LIMITS.MAX_ERROR_DETAILS) } as FileError,
});

const decodeUtf8 = (bytes: Uint8Array): string | null => {
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
        return null;
    }
};

const readRows = (text: string): string[][] | { line: number } => {
    try {
        return parse(text, {
            relax_column_count: true,
            skip_empty_lines: false, // blank lines still count for record numbers
            trim: true,
        }) as string[][];
    } catch (err) {
        return { line: Number((err as { lines?: number }).lines) || 1 };
    }
};

export const parsePipelineCsv = (bytes: Uint8Array): ParseResult => {
    const text = decodeUtf8(bytes);
    if (text === null) {
        return fail(
            FileErrorCode.INVALID_ENCODING,
            'The file is not UTF-8 text. Save it as "CSV UTF-8" and upload it again.'
        );
    }
    if (text.trim() === "") {
        return fail(FileErrorCode.EMPTY_FILE, "The file is empty.");
    }

    const rows = readRows(text);
    if (!Array.isArray(rows)) {
        return fail(
            FileErrorCode.INVALID_CSV,
            `The file is not valid CSV near line ${rows.line}. Check for a missing closing quote.`,
            [`line ${rows.line}`]
        );
    }

    const header = rows[0];
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    header.filter(Boolean).forEach((name) => (seen.has(name) ? duplicates.add(name) : seen.add(name)));
    if (duplicates.size > 0) {
        return fail(FileErrorCode.DUPLICATE_HEADERS, "Some column names appear more than once.", [...duplicates]);
    }

    const missing = REQUIRED_COLUMNS.filter((column) => !seen.has(column));
    if (missing.length > 0) {
        return fail(FileErrorCode.MISSING_HEADERS, `Required columns are missing: ${missing.join(", ")}.`, missing);
    }

    const columnIndex = KNOWN_COLUMNS.map((column) => [column, header.indexOf(column)] as const);
    const records: PipelineRecord[] = [];
    const tooLong: string[] = [];

    rows.slice(1).forEach((fields, index) => {
        if (fields.every((field) => field === "")) {
            return;
        }
        const recordNumber = index + 2;
        const record = { recordNumber, fieldCount: fields.length } as PipelineRecord;
        for (const [column, position] of columnIndex) {
            (record[COLUMN_FIELDS[column]] as string) = fields[position] ?? "";
        }
        for (const [column, maxLength] of Object.entries(TEXT_COLUMN_LIMITS)) {
            if ((record[COLUMN_FIELDS[column as PipelineColumn]] as string).length > maxLength) {
                tooLong.push(`record ${recordNumber}, column ${column} (max ${maxLength})`);
            }
        }
        records.push(record);
    });

    if (records.length === 0) {
        return fail(FileErrorCode.EMPTY_FILE, "The file has a header row but no candidates.");
    }
    if (records.length > PIPELINE_LIMITS.MAX_RECORDS) {
        return fail(
            FileErrorCode.TOO_MANY_ROWS,
            `The file has ${records.length} candidates. The limit is ${PIPELINE_LIMITS.MAX_RECORDS}.`
        );
    }
    if (tooLong.length > 0) {
        return fail(FileErrorCode.VALUE_TOO_LONG, "Some values are too long.", tooLong);
    }

    return { ok: true, pipeline: { headerCount: header.length, records } };
};

export type ExportRow = Record<ExportColumn, string | number | null>;

export const guardFormula = (value: string): string => (FORMULA_START.test(value) ? `'${value}` : value);

const toCell = (value: string | number | null): string => {
    if (value === null) {
        return "";
    }
    if (typeof value === "number") {
        return String(value);
    }
    const text = guardFormula(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const buildExportCsv = (rows: ExportRow[]): string => {
    const header = EXPORT_COLUMNS.join(",");
    const body = rows.map((row) => EXPORT_COLUMNS.map((column) => toCell(row[column])).join(","));
    return CSV_BOM + [header, ...body].join(CSV_LINE_END) + CSV_LINE_END;
};
