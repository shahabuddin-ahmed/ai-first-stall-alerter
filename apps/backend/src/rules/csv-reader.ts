import { parse } from "csv-parse/sync";
import { BOARD_LIMITS, BoardColumn, FileErrorCode, KNOWN_COLUMNS, REQUIRED_COLUMNS } from "../constant/board";
import { BoardRecord, FileError, ParseResult } from "./types";

export const COLUMN_FIELDS: Record<BoardColumn, keyof BoardRecord> = {
    [BoardColumn.CANDIDATE_ID]: "candidateId",
    [BoardColumn.NAME]: "name",
    [BoardColumn.ROLE]: "role",
    [BoardColumn.STAGE]: "stage",
    [BoardColumn.STAGE_ENTERED_AT]: "stageEnteredAt",
    [BoardColumn.RECRUITER]: "recruiter",
    [BoardColumn.LAST_ACTIVITY_AT]: "lastActivityAt",
    [BoardColumn.LAST_CONTACTED_AT]: "lastContactedAt",
};

const fail = (code: FileErrorCode, message: string, details: string[] = []): ParseResult => ({
    ok: false,
    error: { code, message, details: details.slice(0, BOARD_LIMITS.MAX_ERROR_DETAILS) } as FileError,
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

export const parseBoardCsv = (bytes: Uint8Array): ParseResult => {
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
    const records: BoardRecord[] = [];
    const tooLong: string[] = [];

    rows.slice(1).forEach((fields, index) => {
        if (fields.every((field) => field === "")) {
            return;
        }
        const recordNumber = index + 2;
        const record = { recordNumber, fieldCount: fields.length } as BoardRecord;
        for (const [column, position] of columnIndex) {
            const value = fields[position] ?? "";
            if (value.length > BOARD_LIMITS.MAX_VALUE_LENGTH) {
                tooLong.push(`record ${recordNumber}, column ${column}`);
            }
            (record[COLUMN_FIELDS[column]] as string) = value;
        }
        records.push(record);
    });

    if (records.length === 0) {
        return fail(FileErrorCode.EMPTY_FILE, "The file has a header row but no candidates.");
    }
    if (records.length > BOARD_LIMITS.MAX_RECORDS) {
        return fail(
            FileErrorCode.TOO_MANY_ROWS,
            `The file has ${records.length} candidates. The limit is ${BOARD_LIMITS.MAX_RECORDS}.`
        );
    }
    if (tooLong.length > 0) {
        return fail(
            FileErrorCode.VALUE_TOO_LONG,
            `Some values are longer than ${BOARD_LIMITS.MAX_VALUE_LENGTH} characters.`,
            tooLong
        );
    }

    return { ok: true, board: { headerCount: header.length, records } };
};
