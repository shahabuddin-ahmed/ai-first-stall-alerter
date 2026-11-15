import { BoardColumn, BottleneckType, FileErrorCode, RowErrorCode } from "../constant/board";
import { ActionCode, RecipientType, StageType, TimerSource } from "../constant/stage";

// A hiring stage as configured by the team (the `stages` table).
export interface StageConfig {
    name: string;
    type: StageType;
    thresholdDays: number | null;
    position: number;
    aliases: string[];
    actionCode: ActionCode | null;
}

// One CSV record as stored: the 8 known columns as raw (trimmed) text. "" = empty or column not in the file.
export interface BoardRecord {
    recordNumber: number;
    fieldCount: number;
    candidateId: string;
    name: string;
    role: string;
    stage: string;
    stageEnteredAt: string;
    recruiter: string;
    lastActivityAt: string;
    lastContactedAt: string;
}

export interface ParsedBoard {
    headerCount: number;
    records: BoardRecord[];
}

export interface FileError {
    code: FileErrorCode;
    message: string;
    details: string[];
}

export type ParseResult = { ok: true; board: ParsedBoard } | { ok: false; error: FileError };

export interface FieldError {
    field: BoardColumn | string;
    code: RowErrorCode;
    problem: string;
}

export interface RowError {
    recordNumber: number;
    candidateId: string;
    errors: FieldError[];
}

export interface QueueItem {
    rank: number;
    recordNumber: number;
    candidateId: string;
    name: string;
    firstName: string;
    role: string;
    stage: string;
    stagePosition: number;
    recruiter: string;
    timerFrom: string;
    timerSource: TimerSource;
    daysInStage: number;
    stageThreshold: number;
    overdueDays: number;
    actionCode: ActionCode;
    actionLabel: string;
    recipient: RecipientType;
    lastContactedAt: string | null;
    daysSinceContact: number | null;
    reason: string;
    templateMessage: string;
}

export interface Bottleneck {
    type: BottleneckType;
    key: string;
    stalled: number;
}

export interface BoardCounts {
    total: number;
    valid: number;
    invalid: number;
    terminal: number;
    onHold: number;
    stalled: number;
    notStalled: number;
}

export interface BoardAnalysis {
    referenceDate: string;
    counts: BoardCounts;
    rowErrors: RowError[];
    queue: QueueItem[];
    bottlenecks: Bottleneck[];
}
