import { ActionCode, RecipientType, TimerSource } from "../constant/stage";
import { PipelineAnalysis, Bottleneck, MessageFacts, ReasonFacts, QueueItem } from "./pipeline-types";
import { BottleneckType } from "../constant/pipeline";
import { AI_LIMITS, RECRUITER_KEY_PREFIX } from "../constant/ai";

interface ActionDetails {
    label: string;
    instruction: string;
    recipient: RecipientType;
    template: string;
}

export const ACTIONS: Record<ActionCode, ActionDetails> = {
    [ActionCode.REVIEW_APPLICATION]: {
        label: "Review the application",
        instruction: "review the application",
        recipient: RecipientType.HIRING_MANAGER,
        template:
            "Hi, could you review {{name}}'s application for the {{role}} role? It is waiting in Applied and needs a decision on the next step. Thanks, {{recruiter}}",
    },
    [ActionCode.SCHEDULE_SCREEN]: {
        label: "Schedule a screening call",
        instruction: "schedule a screening call",
        recipient: RecipientType.CANDIDATE,
        template:
            "Hi {{first_name}}, thank you for your interest in the {{role}} position. I would like to schedule a short screening call. Could you share a few times that suit you? Best regards, {{recruiter}}",
    },
    [ActionCode.REQUEST_FEEDBACK]: {
        label: "Request interview feedback",
        instruction: "request interview feedback",
        recipient: RecipientType.INTERVIEW_PANEL,
        template:
            "Hi team, could you share your interview feedback on {{name}} for the {{role}} role? We need it to decide the next step. Thanks, {{recruiter}}",
    },
    [ActionCode.REVIEW_ASSESSMENT]: {
        label: "Review the assessment",
        instruction: "review the assessment",
        recipient: RecipientType.ASSESSMENT_REVIEWER,
        template:
            "Hi, could you review {{name}}'s assessment for the {{role}} role and share your result? Thanks, {{recruiter}}",
    },
    [ActionCode.CHASE_REFERENCES]: {
        label: "Chase references",
        instruction: "chase the references",
        recipient: RecipientType.CANDIDATE,
        template:
            "Hi {{first_name}}, we are still waiting on your references for the {{role}} position. Could you check that your referees have received our request? Best regards, {{recruiter}}",
    },
    [ActionCode.CONFIRM_OFFER]: {
        label: "Confirm the offer decision",
        instruction: "confirm the offer decision",
        recipient: RecipientType.CANDIDATE,
        template:
            "Hi {{first_name}}, I am following up on the offer for the {{role}} position. Please let me know your decision or any questions you have. Best regards, {{recruiter}}",
    },
    [ActionCode.GENERIC_FOLLOW_UP]: {
        label: "General follow-up",
        instruction: "follow up with the candidate",
        recipient: RecipientType.CANDIDATE,
        template:
            "Hi {{first_name}}, I am following up on your application for the {{role}} position. Best regards, {{recruiter}}",
    },
};

const days = (count: number): string => `${count} ${count === 1 ? "day" : "days"}`;

export const firstNameOf = (name: string): string => {
    const given = name.includes(",") ? name.slice(name.indexOf(",") + 1) : name;
    return given.trim().split(/\s+/)[0] || name;
};

export const explainReason = (facts: ReasonFacts): string => {
    const opening =
        facts.timerSource === TimerSource.LAST_ACTIVITY
            ? `${facts.name} has had no activity in ${facts.stage} since ${facts.timerFrom} (${days(facts.daysInStage)}).`
            : `${facts.name} has been in ${facts.stage} for ${days(facts.daysInStage)} with no recorded activity.`;
    const overdue =
        facts.overdueDays > 0
            ? `so the application is ${days(facts.overdueDays)} overdue.`
            : "so the follow-up is due today.";

    return (
        `${opening} The ${facts.stage} threshold is ${days(facts.stageThreshold)}, ${overdue} ` +
        `${facts.recruiter} should ${ACTIONS[facts.actionCode].instruction}.`
    );
};

export const fillPlaceholders = (text: string, facts: MessageFacts): string =>
    text
        .replace(/\{\{first_name\}\}/g, facts.firstName)
        .replace(/\{\{name\}\}/g, facts.name)
        .replace(/\{\{role\}\}/g, facts.role)
        .replace(/\{\{recruiter\}\}/g, facts.recruiter);

export const templateMessage = (actionCode: ActionCode, facts: MessageFacts): string =>
    fillPlaceholders(ACTIONS[actionCode].template, facts);

export const templateBriefing = (analysis: PipelineAnalysis): string => {
    const { counts, queue, bottlenecks } = analysis;
    if (queue.length === 0) {
        return `Nobody is past their stage threshold. ${counts.valid} valid ${counts.valid === 1 ? "candidate was" : "candidates were"} checked.`;
    }
    const first = queue[0];
    const firstStatus = first.overdueDays > 0 ? `${days(first.overdueDays)} overdue` : "due today";
    const parts = [
        `${counts.stalled} of ${counts.valid} valid candidates are past their stage threshold.`,
        `Start with ${first.name} (${first.stage}, ${firstStatus}).`,
    ];
    for (const bottleneck of bottlenecks) {
        parts.push(
            bottleneck.type === BottleneckType.STAGE
                ? `Most stalled candidates are in ${bottleneck.key} (${bottleneck.stalled}).`
                : `${bottleneck.key} has the most follow-ups (${bottleneck.stalled}).`
        );
    }
    return parts.join(" ");
};

export const templateBottleneckNote = (bottleneck: Bottleneck): string =>
    bottleneck.type === BottleneckType.STAGE
        ? `${bottleneck.key} has ${bottleneck.stalled} stalled candidates. Clear these follow-ups first.`
        : `${bottleneck.key} owns ${bottleneck.stalled} stalled follow-ups. Consider sharing some of them.`;

export const RECIPIENT_LABELS: Record<RecipientType, string> = {
    [RecipientType.HIRING_MANAGER]: "Hiring manager",
    [RecipientType.CANDIDATE]: "Candidate",
    [RecipientType.INTERVIEW_PANEL]: "Interview panel",
    [RecipientType.ASSESSMENT_REVIEWER]: "Assessment reviewer",
};

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

export const buildInsightFacts = (analysis: PipelineAnalysis, topN: number): InsightFacts => {
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
