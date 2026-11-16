import { PipelineColumn, BottleneckType, FileErrorCode, RowErrorCode } from "../constant/pipeline";
import { ActionCode, RecipientType, StageType, TimerSource } from "../constant/stage";

export interface StageInput {
    name: string;
    type: StageType;
    thresholdDays: number | null;
    aliases: string[];
    actionCode: ActionCode | null;
}

export interface StageConfig extends StageInput {
    position: number;
}

export interface RecordText {
    recordNumber: number;
    fieldCount: number;
    candidateId: string;
    name: string;
    role: string;
    stage: string;
    recruiter: string;
}

export interface PipelineRecord extends RecordText {
    stageEnteredAt: string;
    lastActivityAt: string;
    lastContactedAt: string;
}

export interface ParsedPipeline {
    headerCount: number;
    records: PipelineRecord[];
}

export interface FileError {
    code: FileErrorCode;
    message: string;
    details: string[];
}

export type ParseResult = { ok: true; pipeline: ParsedPipeline } | { ok: false; error: FileError };

export interface FieldError {
    field: PipelineColumn | string;
    code: RowErrorCode;
    problem: string;
}

export interface RowError {
    recordNumber: number;
    candidateId: string;
    errors: FieldError[];
}

export interface MessageFacts {
    name: string;
    firstName: string;
    role: string;
    recruiter: string;
}

export interface ReasonFacts {
    name: string;
    stage: string;
    recruiter: string;
    actionCode: ActionCode;
    stageThreshold: number;
    timerFrom: string;
    timerSource: TimerSource;
    daysInStage: number;
    overdueDays: number;
}

export interface StalledCandidate extends MessageFacts, ReasonFacts {
    recordNumber: number;
    candidateId: string;
    stagePosition: number;
    actionLabel: string;
    recipient: RecipientType;
    lastContactedAt: string | null;
    daysSinceContact: number | null;
}

export interface QueueItem extends StalledCandidate {
    rank: number;
    reason: string;
    templateMessage: string;
}

export interface Bottleneck {
    type: BottleneckType;
    key: string;
    stalled: number;
}

export interface PipelineCounts {
    total: number;
    valid: number;
    invalid: number;
    terminal: number;
    onHold: number;
    stalled: number;
    notStalled: number;
}

export interface PipelineAnalysis {
    referenceDate: string;
    counts: PipelineCounts;
    rowErrors: RowError[];
    queue: QueueItem[];
    bottlenecks: Bottleneck[];
}

export interface Page<T> {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
}
