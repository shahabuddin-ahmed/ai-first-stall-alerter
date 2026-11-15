import { CSV_BOM, CSV_LINE_END, EXPORT_COLUMNS, ExportColumn, FORMULA_START } from "../constant/export";

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
