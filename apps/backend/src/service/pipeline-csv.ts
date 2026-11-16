import { parse } from "csv-parse/sync";
import {
    PIPELINE_LIMITS,
    PipelineColumn,
    FileErrorCode,
    REQUIRED_COLUMNS,
    TEXT_COLUMN_LIMITS,
} from "../constant/pipeline";
import { ParseResult, PipelineRecord } from "./pipeline-types";
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

export const columnValue = (record: PipelineRecord, column: PipelineColumn): string =>
    record[COLUMN_FIELDS[column]] as string;

const fail = (code: FileErrorCode, message: string, details: string[] = []): ParseResult => ({
    ok: false,
    error: { code, message, details: details.slice(0, PIPELINE_LIMITS.MAX_ERROR_DETAILS) },
});

const decodeUtf8 = (bytes: Uint8Array): string | null => {
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
        return null;
    }
};

const readRows = (text: string): string[][] => {
    const rows = parse(text, {
        relax_column_count: true,
        skip_empty_lines: false, // blank lines still count for record numbers
        trim: true,
    }) as string[][];
    // trim: true keeps spaces inside quotes (" Applied "), so trim every value again
    return rows.map((fields) => fields.map((field) => field.trim()));
};

const errorLineOf = (err: unknown): number => Number((err as { lines?: number }).lines) || 1;

const findDuplicates = (names: string[]): string[] => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const name of names) {
        if (seen.has(name)) {
            duplicates.add(name);
        }
        seen.add(name);
    }
    return [...duplicates];
};

const checkHeader = (header: string[]): ParseResult | null => {
    const duplicates = findDuplicates(header.filter(Boolean));
    if (duplicates.length > 0) {
        return fail(FileErrorCode.DUPLICATE_HEADERS, "Some column names appear more than once.", duplicates);
    }

    const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column));
    if (missing.length > 0) {
        return fail(FileErrorCode.MISSING_HEADERS, `Required columns are missing: ${missing.join(", ")}.`, missing);
    }
    return null;
};

const toRecords = (header: string[], lines: string[][]): PipelineRecord[] => {
    const records: PipelineRecord[] = [];
    lines.forEach((fields, index) => {
        if (fields.every((field) => field === "")) {
            return;
        }
        const valueOf = (column: PipelineColumn): string => fields[header.indexOf(column)] ?? "";
        records.push({
            recordNumber: index + 2,
            fieldCount: fields.length,
            candidateId: valueOf(PipelineColumn.CANDIDATE_ID),
            name: valueOf(PipelineColumn.NAME),
            role: valueOf(PipelineColumn.ROLE),
            stage: valueOf(PipelineColumn.STAGE),
            stageEnteredAt: valueOf(PipelineColumn.STAGE_ENTERED_AT),
            recruiter: valueOf(PipelineColumn.RECRUITER),
            lastActivityAt: valueOf(PipelineColumn.LAST_ACTIVITY_AT),
            lastContactedAt: valueOf(PipelineColumn.LAST_CONTACTED_AT),
        });
    });
    return records;
};

const findTooLongValues = (records: PipelineRecord[]): string[] => {
    const tooLong: string[] = [];
    for (const record of records) {
        for (const [column, maxLength] of Object.entries(TEXT_COLUMN_LIMITS)) {
            if (columnValue(record, column as PipelineColumn).length > maxLength) {
                tooLong.push(`record ${record.recordNumber}, column ${column} (max ${maxLength})`);
            }
        }
    }
    return tooLong;
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

    let rows: string[][];
    try {
        rows = readRows(text);
    } catch (err) {
        const line = errorLineOf(err);
        return fail(
            FileErrorCode.INVALID_CSV,
            `The file is not valid CSV near line ${line}. Check for a missing closing quote.`,
            [`line ${line}`]
        );
    }

    const [header, ...lines] = rows;
    const headerError = checkHeader(header);
    if (headerError) {
        return headerError;
    }

    const records = toRecords(header, lines);
    if (records.length === 0) {
        return fail(FileErrorCode.EMPTY_FILE, "The file has a header row but no candidates.");
    }
    if (records.length > PIPELINE_LIMITS.MAX_RECORDS) {
        return fail(
            FileErrorCode.TOO_MANY_ROWS,
            `The file has ${records.length} candidates. The limit is ${PIPELINE_LIMITS.MAX_RECORDS}.`
        );
    }

    const tooLong = findTooLongValues(records);
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
