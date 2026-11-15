import { EXPORT_COLUMNS, ExportColumn, FORMULA_START } from "../constant/export";

export type ExportRow = Record<ExportColumn, string | number | null>;

const BOM = "﻿"; // lets Excel read the file as UTF-8 (names with accents)
const LINE_END = "\r\n"; // RFC 4180

// A value that would start a spreadsheet formula gets a ' in front, so it shows as text.
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

// The follow-up queue as a CSV file (spec C8).
export const buildExportCsv = (rows: ExportRow[]): string => {
    const header = EXPORT_COLUMNS.join(",");
    const body = rows.map((row) => EXPORT_COLUMNS.map((column) => toCell(row[column])).join(","));
    return BOM + [header, ...body].join(LINE_END) + LINE_END;
};
