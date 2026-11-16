import { BoardColumn, DATE_COLUMNS, INVALID_DATE_TEXT } from "../constant/board";
import { ImportRecordInterface } from "../model/import-record";
import { COLUMN_FIELDS } from "./csv-reader";
import { parseIsoDate } from "./dates";
import { BoardRecord } from "./types";

const isInvalidDate = (value: string): boolean => value !== "" && parseIsoDate(value) === null;

const storedDate = (value: string): string | null => (value === "" || isInvalidDate(value) ? null : value);

const restoredDate = (value: string | null, column: BoardColumn, invalidDates: BoardColumn[] | null): string =>
    value ?? (invalidDates?.includes(column) ? INVALID_DATE_TEXT : "");

export const toStoredRecord = (record: BoardRecord, importId: number): ImportRecordInterface => {
    const invalidDates = DATE_COLUMNS.filter((column) => isInvalidDate(record[COLUMN_FIELDS[column]] as string));
    return {
        ...record,
        importId,
        stageEnteredAt: storedDate(record.stageEnteredAt),
        lastActivityAt: storedDate(record.lastActivityAt),
        lastContactedAt: storedDate(record.lastContactedAt),
        invalidDates: invalidDates.length > 0 ? invalidDates : null,
    };
};

export const toBoardRecord = ({ invalidDates, ...stored }: ImportRecordInterface): BoardRecord => ({
    ...stored,
    stageEnteredAt: restoredDate(stored.stageEnteredAt, BoardColumn.STAGE_ENTERED_AT, invalidDates),
    lastActivityAt: restoredDate(stored.lastActivityAt, BoardColumn.LAST_ACTIVITY_AT, invalidDates),
    lastContactedAt: restoredDate(stored.lastContactedAt, BoardColumn.LAST_CONTACTED_AT, invalidDates),
});
