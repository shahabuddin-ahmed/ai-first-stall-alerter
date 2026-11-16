import {
    StageConfig,
    PipelineRecord,
    FieldError,
    ParsedPipeline,
    RowError,
    Bottleneck,
    QueueItem,
    PipelineAnalysis,
    StalledCandidate,
} from "./pipeline-types";
import {
    PipelineColumn,
    OPTIONAL_DATE_COLUMNS,
    RECORD_FIELD,
    REQUIRED_COLUMNS,
    RowErrorCode,
    PIPELINE_LIMITS,
    BottleneckType,
} from "../constant/pipeline";
import { COLUMN_FIELDS } from "./pipeline-csv";
import { parseIsoDate, daysBetween } from "../utils/dates";
import { ActionCode, StageType, TimerSource, STAGE_LIMITS } from "../constant/stage";
import { ACTIONS, explainReason, firstNameOf, templateMessage } from "./pipeline-messages";

export const normaliseStageName = (value: string): string => value.replace(/\s+/g, " ").toLowerCase();

export const buildStageLookup = (stages: StageConfig[]): Map<string, StageConfig> => {
    const lookup = new Map<string, StageConfig>();
    for (const stage of stages) {
        for (const name of [stage.name, ...stage.aliases]) {
            lookup.set(normaliseStageName(name), stage);
        }
    }
    return lookup;
};

interface RecordDays {
    stage: StageConfig;
    enteredDay: number;
    activityDay: number | null;
    contactDay: number | null;
}

export interface ValidRecord extends RecordDays {
    record: PipelineRecord;
}

interface CheckedRecord {
    record: PipelineRecord;
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

const checkDate = (
    column: PipelineColumn,
    value: string,
    referenceDay: number,
    errors: FieldError[]
): number | null => {
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
    pipeline: ParsedPipeline,
    stageLookup: Map<string, StageConfig>,
    referenceDay: number
): { valid: ValidRecord[]; rowErrors: RowError[] } => {
    const rowErrors: RowError[] = [];
    const checked: CheckedRecord[] = [];

    for (const record of pipeline.records) {
        if (record.fieldCount !== pipeline.headerCount) {
            rowErrors.push({
                recordNumber: record.recordNumber,
                candidateId: record.candidateId,
                errors: [
                    {
                        field: RECORD_FIELD,
                        code: RowErrorCode.FIELD_COUNT,
                        problem: PROBLEMS.fieldCount(record.fieldCount, pipeline.headerCount),
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
                field: PipelineColumn.STAGE,
                code: RowErrorCode.UNKNOWN_STAGE,
                problem: PROBLEMS.unknownStage(record.stage),
            });
        }

        const enteredDay = checkDate(PipelineColumn.STAGE_ENTERED_AT, record.stageEnteredAt, referenceDay, errors);
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
                field: PipelineColumn.CANDIDATE_ID,
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

const countBy = (items: QueueItem[], key: (item: QueueItem) => string): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const item of items) {
        const value = key(item);
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return counts;
};

export const findBottlenecks = (queue: QueueItem[]): Bottleneck[] => {
    const bottlenecks: Bottleneck[] = [];

    const positions = new Map(queue.map((item) => [item.stage, item.stagePosition]));
    const [topStage] = [...countBy(queue, (item) => item.stage)].sort(
        ([stageA, countA], [stageB, countB]) => countB - countA || positions.get(stageB)! - positions.get(stageA)!
    );
    if (topStage && topStage[1] >= PIPELINE_LIMITS.MIN_BOTTLENECK_STALLED) {
        bottlenecks.push({ type: BottleneckType.STAGE, key: topStage[0], stalled: topStage[1] });
    }

    const [topRecruiter] = [...countBy(queue, (item) => item.recruiter)].sort(
        ([nameA, countA], [nameB, countB]) => countB - countA || (nameA < nameB ? -1 : nameA > nameB ? 1 : 0)
    );
    if (topRecruiter && topRecruiter[1] >= PIPELINE_LIMITS.MIN_BOTTLENECK_STALLED) {
        bottlenecks.push({ type: BottleneckType.RECRUITER, key: topRecruiter[0], stalled: topRecruiter[1] });
    }

    return bottlenecks;
};

const byUrgency = (a: StalledCandidate, b: StalledCandidate): number =>
    b.overdueDays - a.overdueDays ||
    b.stagePosition - a.stagePosition ||
    (a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0);

export const analysePipeline = (
    pipeline: ParsedPipeline,
    stages: StageConfig[],
    referenceDate: string
): PipelineAnalysis => {
    const referenceDay = parseIsoDate(referenceDate) as number;

    const { valid, rowErrors } = validateRecords(pipeline, buildStageLookup(stages), referenceDay);

    let terminal = 0;
    let onHold = 0;
    let notStalled = 0;
    const stalled: StalledCandidate[] = [];

    for (const { record, stage, enteredDay, activityDay, contactDay } of valid) {
        if (stage.type === StageType.FINAL) {
            terminal += 1;
            continue;
        }
        if (stage.type === StageType.PAUSED) {
            onHold += 1;
            continue;
        }
        const threshold = stage.thresholdDays as number;

        const fromActivity = activityDay !== null && activityDay > enteredDay;
        const daysInStage = daysBetween(fromActivity ? activityDay : enteredDay, referenceDay);
        if (daysInStage < threshold) {
            notStalled += 1;
            continue;
        }

        const actionCode = stage.actionCode ?? ActionCode.GENERIC_FOLLOW_UP;
        stalled.push({
            recordNumber: record.recordNumber,
            candidateId: record.candidateId,
            name: record.name,
            firstName: firstNameOf(record.name),
            role: record.role,
            stage: stage.name,
            stagePosition: stage.position,
            recruiter: record.recruiter,
            timerFrom: fromActivity ? record.lastActivityAt : record.stageEnteredAt,
            timerSource: fromActivity ? TimerSource.LAST_ACTIVITY : TimerSource.STAGE_ENTERED,
            daysInStage,
            stageThreshold: threshold,
            overdueDays: daysInStage - threshold,
            actionCode,
            actionLabel: ACTIONS[actionCode].label,
            recipient: ACTIONS[actionCode].recipient,
            lastContactedAt: record.lastContactedAt || null,
            daysSinceContact: contactDay === null ? null : daysBetween(contactDay, referenceDay),
        });
    }

    const queue: QueueItem[] = stalled.sort(byUrgency).map((item, index) => ({
        ...item,
        rank: index + 1,
        reason: explainReason(item),
        templateMessage: templateMessage(item.actionCode, item),
    }));

    return {
        referenceDate,
        counts: {
            total: pipeline.records.length,
            valid: valid.length,
            invalid: rowErrors.length,
            terminal,
            onHold,
            stalled: queue.length,
            notStalled,
        },
        rowErrors,
        queue,
        bottlenecks: findBottlenecks(queue),
    };
};

export interface QueueFilter {
    stage?: string;
    recruiter?: string;
    search?: string;
}

export const filterQueue = (queue: QueueItem[], filter: QueueFilter): QueueItem[] => {
    const search = filter.search?.toLowerCase();
    return queue.filter(
        (item) =>
            (!filter.stage || item.stage === filter.stage) &&
            (!filter.recruiter || item.recruiter === filter.recruiter) &&
            (!search || item.name.toLowerCase().includes(search) || item.candidateId.toLowerCase().includes(search))
    );
};

export const findStageListProblems = (stages: StageConfig[]): string[] => {
    const problems: string[] = [];

    if (!stages.some((stage) => stage.type === StageType.WATCHED)) {
        problems.push("Add at least one watched stage.");
    }

    const seen = new Set<string>();
    for (const stage of stages) {
        for (const name of [stage.name, ...stage.aliases]) {
            const key = normaliseStageName(name);
            if (seen.has(key)) {
                problems.push(`"${name}" is used more than once (as a stage name or alias).`);
            }
            seen.add(key);
        }
    }

    for (const stage of stages.filter((item) => item.type === StageType.WATCHED)) {
        if (stage.thresholdDays === null) {
            problems.push(
                `"${stage.name}" needs a threshold between ${STAGE_LIMITS.MIN_THRESHOLD_DAYS} and ${STAGE_LIMITS.MAX_THRESHOLD_DAYS} days.`
            );
        }
        if (stage.actionCode === null) {
            problems.push(`"${stage.name}" needs a follow-up action.`);
        }
    }

    return problems;
};
