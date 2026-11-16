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
    RECORD_FIELD,
    REQUIRED_COLUMNS,
    RowErrorCode,
    PIPELINE_LIMITS,
    BottleneckType,
} from "../constant/pipeline";
import { columnValue } from "./pipeline-csv";
import { parseIsoDate, daysBetween } from "../utils/dates";
import { compareText } from "../utils/utility";
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

const fieldCountError = (record: PipelineRecord, headerCount: number): RowError => ({
    recordNumber: record.recordNumber,
    candidateId: record.candidateId,
    errors: [
        {
            field: RECORD_FIELD,
            code: RowErrorCode.FIELD_COUNT,
            problem: PROBLEMS.fieldCount(record.fieldCount, headerCount),
        },
    ],
});

const checkRecord = (
    record: PipelineRecord,
    stageLookup: Map<string, StageConfig>,
    referenceDay: number
): CheckedRecord => {
    const errors: FieldError[] = [];
    for (const column of REQUIRED_COLUMNS) {
        if (columnValue(record, column) === "") {
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
    const activityDay = checkDate(PipelineColumn.LAST_ACTIVITY_AT, record.lastActivityAt, referenceDay, errors);
    const contactDay = checkDate(PipelineColumn.LAST_CONTACTED_AT, record.lastContactedAt, referenceDay, errors);

    // The days are only used when there are no errors, so the stage and the entered day are known by then.
    const days = { stage: stage as StageConfig, enteredDay: enteredDay as number, activityDay, contactDay };
    return { record, errors, days };
};

const recordNumbersById = (checked: CheckedRecord[]): Map<string, number[]> => {
    const numbersById = new Map<string, number[]>();
    for (const { record } of checked) {
        if (record.candidateId === "") {
            continue;
        }
        const numbers = numbersById.get(record.candidateId) ?? [];
        numbers.push(record.recordNumber);
        numbersById.set(record.candidateId, numbers);
    }
    return numbersById;
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
            rowErrors.push(fieldCountError(record, pipeline.headerCount));
        } else {
            checked.push(checkRecord(record, stageLookup, referenceDay));
        }
    }

    const numbersById = recordNumbersById(checked);
    const valid: ValidRecord[] = [];
    for (const { record, errors, days } of checked) {
        const others = (numbersById.get(record.candidateId) ?? []).filter((number) => number !== record.recordNumber);
        if (others.length > 0) {
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

interface StalledCount {
    key: string;
    stalled: number;
}

const countBy = (queue: QueueItem[], keyOf: (item: QueueItem) => string): StalledCount[] => {
    const counts = new Map<string, number>();
    for (const item of queue) {
        const key = keyOf(item);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts].map(([key, stalled]) => ({ key, stalled }));
};

export const findBottlenecks = (queue: QueueItem[]): Bottleneck[] => {
    const positions = new Map(queue.map((item) => [item.stage, item.stagePosition]));
    const positionOf = (stage: string): number => positions.get(stage) ?? 0;

    const [topStage] = countBy(queue, (item) => item.stage).sort(
        (a, b) => b.stalled - a.stalled || positionOf(b.key) - positionOf(a.key)
    );
    const [topRecruiter] = countBy(queue, (item) => item.recruiter).sort(
        (a, b) => b.stalled - a.stalled || compareText(a.key, b.key)
    );

    const bottlenecks: Bottleneck[] = [];
    if (topStage && topStage.stalled >= PIPELINE_LIMITS.MIN_BOTTLENECK_STALLED) {
        bottlenecks.push({ type: BottleneckType.STAGE, ...topStage });
    }
    if (topRecruiter && topRecruiter.stalled >= PIPELINE_LIMITS.MIN_BOTTLENECK_STALLED) {
        bottlenecks.push({ type: BottleneckType.RECRUITER, ...topRecruiter });
    }
    return bottlenecks;
};

const byUrgency = (a: StalledCandidate, b: StalledCandidate): number =>
    b.overdueDays - a.overdueDays || b.stagePosition - a.stagePosition || compareText(a.candidateId, b.candidateId);

const toCandidate = (
    { record, stage, enteredDay, activityDay, contactDay }: ValidRecord,
    referenceDay: number
): StalledCandidate => {
    const threshold = stage.thresholdDays as number;
    const fromActivity = activityDay !== null && activityDay > enteredDay;
    const daysInStage = daysBetween(fromActivity ? activityDay : enteredDay, referenceDay);
    const actionCode = stage.actionCode ?? ActionCode.GENERIC_FOLLOW_UP;

    return {
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
    };
};

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

    for (const item of valid) {
        if (item.stage.type === StageType.FINAL) {
            terminal += 1;
            continue;
        }
        if (item.stage.type === StageType.PAUSED) {
            onHold += 1;
            continue;
        }
        const candidate = toCandidate(item, referenceDay);
        if (candidate.overdueDays < 0) {
            notStalled += 1;
            continue;
        }
        stalled.push(candidate);
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
