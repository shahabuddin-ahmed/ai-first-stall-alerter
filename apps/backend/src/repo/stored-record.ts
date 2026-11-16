import { DATE_COLUMNS, INVALID_DATE_TEXT, PipelineColumn } from "../constant/pipeline";
import { ImportRecordInterface } from "../model/import-record";
import { columnValue } from "../service/pipeline-csv";
import { PipelineRecord } from "../service/pipeline-types";
import { parseIsoDate } from "../utils/dates";

const isInvalidDate = (value: string): boolean => value !== "" && parseIsoDate(value) === null;

const storedDate = (value: string): string | null => (parseIsoDate(value) === null ? null : value);

const restoredDate = (value: string | null, column: PipelineColumn, invalidDates: PipelineColumn[] | null): string =>
    value ?? (invalidDates?.includes(column) ? INVALID_DATE_TEXT : "");

export const toStoredRecord = (record: PipelineRecord, importId: number): ImportRecordInterface => {
    const invalidDates = DATE_COLUMNS.filter((column) => isInvalidDate(columnValue(record, column)));
    return {
        ...record,
        importId,
        stageEnteredAt: storedDate(record.stageEnteredAt),
        lastActivityAt: storedDate(record.lastActivityAt),
        lastContactedAt: storedDate(record.lastContactedAt),
        invalidDates: invalidDates.length > 0 ? invalidDates : null,
    };
};

export const toPipelineRecord = ({ invalidDates, ...stored }: ImportRecordInterface): PipelineRecord => ({
    ...stored,
    stageEnteredAt: restoredDate(stored.stageEnteredAt, PipelineColumn.STAGE_ENTERED_AT, invalidDates),
    lastActivityAt: restoredDate(stored.lastActivityAt, PipelineColumn.LAST_ACTIVITY_AT, invalidDates),
    lastContactedAt: restoredDate(stored.lastContactedAt, PipelineColumn.LAST_CONTACTED_AT, invalidDates),
});
