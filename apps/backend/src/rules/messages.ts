import { ActionCode, RecipientType, TimerSource } from "../constant/stage";
import { BoardAnalysis, Bottleneck } from "./types";
import { BottleneckType } from "../constant/board";

interface ActionDetails {
    label: string; // shown in the queue
    instruction: string; // used in the reason sentence: "{recruiter} should {instruction}."
    recipient: RecipientType;
    template: string; // fallback message (spec C5): carries out the action, no promises or guesses
}

// What to do for each action code, and who the message goes to (spec C2, C5).
export const ACTIONS: Record<ActionCode, ActionDetails> = {
    [ActionCode.REVIEW_APPLICATION]: {
        label: "Review the application",
        instruction: "review the application",
        recipient: RecipientType.HIRING_MANAGER,
        template: "Hi, could you review {name}'s application for the {role} role? It is waiting in Applied and needs a decision on the next step. Thanks, {recruiter}",
    },
    [ActionCode.SCHEDULE_SCREEN]: {
        label: "Schedule a screening call",
        instruction: "schedule a screening call",
        recipient: RecipientType.CANDIDATE,
        template: "Hi {first_name}, thank you for your interest in the {role} position. I would like to schedule a short screening call. Could you share a few times that suit you? Best regards, {recruiter}",
    },
    [ActionCode.REQUEST_FEEDBACK]: {
        label: "Request interview feedback",
        instruction: "request interview feedback",
        recipient: RecipientType.INTERVIEW_PANEL,
        template: "Hi team, could you share your interview feedback on {name} for the {role} role? We need it to decide the next step. Thanks, {recruiter}",
    },
    [ActionCode.REVIEW_ASSESSMENT]: {
        label: "Review the assessment",
        instruction: "review the assessment",
        recipient: RecipientType.ASSESSMENT_REVIEWER,
        template: "Hi, could you review {name}'s assessment for the {role} role and share your result? Thanks, {recruiter}",
    },
    [ActionCode.CHASE_REFERENCES]: {
        label: "Chase references",
        instruction: "chase the references",
        recipient: RecipientType.CANDIDATE,
        template: "Hi {first_name}, we are still waiting on your references for the {role} position. Could you check that your referees have received our request? Best regards, {recruiter}",
    },
    [ActionCode.CONFIRM_OFFER]: {
        label: "Confirm the offer decision",
        instruction: "confirm the offer decision",
        recipient: RecipientType.CANDIDATE,
        template: "Hi {first_name}, I am following up on the offer for the {role} position. Please let me know your decision or any questions you have. Best regards, {recruiter}",
    },
    [ActionCode.GENERIC_FOLLOW_UP]: {
        label: "General follow-up",
        instruction: "follow up with the candidate",
        recipient: RecipientType.CANDIDATE,
        template: "Hi {first_name}, I am following up on your application for the {role} position. Best regards, {recruiter}",
    },
};

const days = (count: number): string => `${count} ${count === 1 ? "day" : "days"}`;

// "Lopes, Ana" → "Ana"; "Amara Okafor" → "Amara"
export const firstNameOf = (name: string): string => {
    const given = name.includes(",") ? name.slice(name.indexOf(",") + 1) : name;
    return given.trim().split(/\s+/)[0] || name.trim();
};

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

// Why this candidate is in the queue (spec C5), in one short paragraph.
export const explainReason = (facts: ReasonFacts): string => {
    const opening =
        facts.timerSource === TimerSource.LAST_ACTIVITY
            ? `${facts.name} has had no activity in ${facts.stage} since ${facts.timerFrom} (${days(facts.daysInStage)}).`
            : `${facts.name} has been in ${facts.stage} for ${days(facts.daysInStage)} with no recorded activity.`;
    const overdue =
        facts.overdueDays > 0
            ? `so the application is ${days(facts.overdueDays)} overdue.`
            : "so the follow-up is due today.";

    return `${opening} The ${facts.stage} threshold is ${days(facts.stageThreshold)}, ${overdue} ` +
        `${facts.recruiter} should ${ACTIONS[facts.actionCode].instruction}.`;
};

export interface MessageFacts {
    name: string;
    firstName: string;
    role: string;
    recruiter: string;
}

// The template message for an action, filled with the candidate's details.
export const templateMessage = (actionCode: ActionCode, facts: MessageFacts): string =>
    ACTIONS[actionCode].template
        .replace(/\{first_name\}/g, facts.firstName)
        .replace(/\{name\}/g, facts.name)
        .replace(/\{role\}/g, facts.role)
        .replace(/\{recruiter\}/g, facts.recruiter);

// Fills the AI's placeholders with this candidate's details (done on the server, never by the AI).
export const fillPlaceholders = (text: string, facts: MessageFacts): string =>
    text
        .replace(/\{\{first_name\}\}/g, facts.firstName)
        .replace(/\{\{name\}\}/g, facts.name)
        .replace(/\{\{role\}\}/g, facts.role)
        .replace(/\{\{recruiter\}\}/g, facts.recruiter);

// The briefing written by code, used whenever AI text is not (spec E: template fallback).
export const templateBriefing = (analysis: BoardAnalysis): string => {
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

// Who the message goes to, as people read it (export and screens).
export const RECIPIENT_LABELS: Record<RecipientType, string> = {
    [RecipientType.HIRING_MANAGER]: "Hiring manager",
    [RecipientType.CANDIDATE]: "Candidate",
    [RecipientType.INTERVIEW_PANEL]: "Interview panel",
    [RecipientType.ASSESSMENT_REVIEWER]: "Assessment reviewer",
};
