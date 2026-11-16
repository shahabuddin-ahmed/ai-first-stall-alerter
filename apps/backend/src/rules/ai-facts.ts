import { AI_LIMITS, RECRUITER_KEY_PREFIX } from "../constant/ai";
import { ActionCode, RecipientType } from "../constant/stage";
import { BoardAnalysis, QueueItem } from "./types";
import { BottleneckType } from "../constant/board";

export interface AlertFacts {
    rank: number;
    action_code: ActionCode;
    recipient_type: RecipientType;
    stage_threshold: number;
    days_in_stage: number;
    overdue_days: number;
    days_since_contact: number | null;
    recruiter_key: string;
}

export interface BottleneckFacts {
    type: BottleneckType;
    action_code?: ActionCode;
    recruiter_key?: string;
    stalled: number;
}

export interface InsightFacts {
    board: {
        total: number;
        valid: number;
        invalid: number;
        terminal: number;
        on_hold: number;
        stalled: number;
        not_stalled: number;
        stalled_by_action: Partial<Record<ActionCode, number>>;
        stalled_by_recruiter: { recruiter_key: string; stalled: number }[];
        stalled_by_other_recruiters: number;
    };
    bottlenecks: BottleneckFacts[];
    alerts: AlertFacts[];
}

export const recruiterKeysOf = (queue: QueueItem[]): Map<string, string> => {
    const keys = new Map<string, string>();
    for (const item of queue) {
        if (!keys.has(item.recruiter)) {
            keys.set(item.recruiter, `${RECRUITER_KEY_PREFIX}${keys.size + 1}`);
        }
    }
    return keys;
};

export const buildInsightFacts = (analysis: BoardAnalysis, topN: number): InsightFacts => {
    const { counts, queue } = analysis;

    const recruiterKeys = recruiterKeysOf(queue);
    const keyOf = (recruiter: string) => recruiterKeys.get(recruiter) as string;

    const byAction: Partial<Record<ActionCode, number>> = {};
    const byRecruiter = new Map<string, number>();
    for (const item of queue) {
        const key = keyOf(item.recruiter);
        byAction[item.actionCode] = (byAction[item.actionCode] ?? 0) + 1;
        byRecruiter.set(key, (byRecruiter.get(key) ?? 0) + 1);
    }
    const recruiterCounts = [...byRecruiter]
        .map(([recruiter_key, stalled]) => ({ recruiter_key, stalled }))
        .sort((a, b) => b.stalled - a.stalled);
    const topRecruiters = recruiterCounts.slice(0, AI_LIMITS.TOP_RECRUITERS);

    const actionOfStage = new Map(queue.map((item) => [item.stage, item.actionCode]));

    return {
        board: {
            total: counts.total,
            valid: counts.valid,
            invalid: counts.invalid,
            terminal: counts.terminal,
            on_hold: counts.onHold,
            stalled: counts.stalled,
            not_stalled: counts.notStalled,
            stalled_by_action: byAction,
            stalled_by_recruiter: topRecruiters,
            stalled_by_other_recruiters: recruiterCounts
                .slice(AI_LIMITS.TOP_RECRUITERS)
                .reduce((sum, r) => sum + r.stalled, 0),
        },
        bottlenecks: analysis.bottlenecks.map(
            (bottleneck): BottleneckFacts =>
                bottleneck.type === BottleneckType.STAGE
                    ? {
                          type: BottleneckType.STAGE,
                          action_code: actionOfStage.get(bottleneck.key) as ActionCode,
                          stalled: bottleneck.stalled,
                      }
                    : {
                          type: BottleneckType.RECRUITER,
                          recruiter_key: keyOf(bottleneck.key),
                          stalled: bottleneck.stalled,
                      }
        ),
        alerts: queue.slice(0, topN).map((item) => ({
            rank: item.rank,
            action_code: item.actionCode,
            recipient_type: item.recipient,
            stage_threshold: item.stageThreshold,
            days_in_stage: item.daysInStage,
            overdue_days: item.overdueDays,
            days_since_contact: item.daysSinceContact,
            recruiter_key: keyOf(item.recruiter),
        })),
    };
};

export const actionsOf = (facts: InsightFacts): ActionCode[] =>
    Object.keys(facts.board.stalled_by_action) as ActionCode[];
