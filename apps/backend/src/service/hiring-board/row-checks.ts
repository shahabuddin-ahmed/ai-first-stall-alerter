import { BoardColumn, OPTIONAL_DATE_COLUMNS, RECORD_FIELD, REQUIRED_COLUMNS, RowErrorCode } from "../../constant/board";
import { COLUMN_FIELDS } from "./csv-reader";
import { parseIsoDate } from "../../utils/dates";
import { normaliseStageName } from "./stage-matcher";
import { BoardRecord, FieldError, ParsedBoard, RowError, StageConfig } from "./types";

interface RecordDays {
    stage: StageConfig;
    enteredDay: number;
    activityDay: number | null;
    contactDay: number | null;
}

export interface ValidRecord extends RecordDays {
    record: BoardRecord;
}

interface CheckedRecord {
    record: BoardRecord;
    errors: FieldError[];
    days: RecordDays;
}

const PROBLEMS = {
    missing: "missing value",
    invalidDate: "not a real YYYY-MM-DD date",
    futureDate: "after the reference date",
    unknownStage: (stage: string) => `"${stage}" is not in your hiring stages`,
    fieldCount: (found: number, expected: number) => `${found} fields, expected ${expected}`,
    duplicate: (others: number[]) => `duplicate ID (also record ${others.join(", ")})`,
};

const checkDate = (column: BoardColumn, value: string, referenceDay: number, errors: FieldError[]): number | null => {
    if (value === "") {
        return null;
    }
    const day = parseIsoDate(value);
    if (day === null) {
        errors.push({ field: column, code: RowErrorCode.INVALID_DATE, problem: PROBLEMS.invalidDate });
    } else if (day > referenceDay) {
        errors.push({ field: column, code: RowErrorCode.FUTURE_DATE, problem: PROBLEMS.futureDate });
    }
    return day;
};

export const validateRecords = (
    board: ParsedBoard,
    stageLookup: Map<string, StageConfig>,
    referenceDay: number
): { valid: ValidRecord[]; rowErrors: RowError[] } => {
    const rowErrors: RowError[] = [];
    const checked: CheckedRecord[] = [];

    for (const record of board.records) {
        if (record.fieldCount !== board.headerCount) {
            rowErrors.push({
                recordNumber: record.recordNumber,
                candidateId: record.candidateId,
                errors: [
                    {
                        field: RECORD_FIELD,
                        code: RowErrorCode.FIELD_COUNT,
                        problem: PROBLEMS.fieldCount(record.fieldCount, board.headerCount),
                    },
                ],
            });
            continue;
        }

        const errors: FieldError[] = [];
        for (const column of REQUIRED_COLUMNS) {
            if (record[COLUMN_FIELDS[column]] === "") {
                errors.push({ field: column, code: RowErrorCode.MISSING_VALUE, problem: PROBLEMS.missing });
            }
        }

        const stage = stageLookup.get(normaliseStageName(record.stage));
        if (record.stage !== "" && !stage) {
            errors.push({
                field: BoardColumn.STAGE,
                code: RowErrorCode.UNKNOWN_STAGE,
                problem: PROBLEMS.unknownStage(record.stage),
            });
        }

        const enteredDay = checkDate(BoardColumn.STAGE_ENTERED_AT, record.stageEnteredAt, referenceDay, errors);
        const [activityDay, contactDay] = OPTIONAL_DATE_COLUMNS.map((column) =>
            checkDate(column, record[COLUMN_FIELDS[column]] as string, referenceDay, errors)
        );

        checked.push({
            record,
            errors,
            days: { stage: stage as StageConfig, enteredDay: enteredDay as number, activityDay, contactDay },
        });
    }

    const recordsById = new Map<string, number[]>();
    for (const { record } of checked) {
        if (record.candidateId !== "") {
            recordsById.set(record.candidateId, [...(recordsById.get(record.candidateId) ?? []), record.recordNumber]);
        }
    }

    const valid: ValidRecord[] = [];
    for (const { record, errors, days } of checked) {
        const copies = recordsById.get(record.candidateId) ?? [];
        if (copies.length > 1) {
            const others = copies.filter((number) => number !== record.recordNumber);
            errors.push({
                field: BoardColumn.CANDIDATE_ID,
                code: RowErrorCode.DUPLICATE_ID,
                problem: PROBLEMS.duplicate(others),
            });
        }
        if (errors.length > 0) {
            rowErrors.push({ recordNumber: record.recordNumber, candidateId: record.candidateId, errors });
        } else {
            valid.push({ record, ...days });
        }
    }

    rowErrors.sort((a, b) => a.recordNumber - b.recordNumber);
    return { valid, rowErrors };
};
