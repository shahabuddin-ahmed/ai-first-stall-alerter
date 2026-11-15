// Hiring stage types (spec C2). Watched stages can stall; paused and final stages never do.
export enum StageType {
    WATCHED = "watched",
    PAUSED = "paused",
    FINAL = "final",
}

// The fixed follow-up actions a stage can use. The AI only ever sees these codes, never stage names.
export enum ActionCode {
    REVIEW_APPLICATION = "REVIEW_APPLICATION",
    SCHEDULE_SCREEN = "SCHEDULE_SCREEN",
    REQUEST_FEEDBACK = "REQUEST_FEEDBACK",
    REVIEW_ASSESSMENT = "REVIEW_ASSESSMENT",
    CHASE_REFERENCES = "CHASE_REFERENCES",
    CONFIRM_OFFER = "CONFIRM_OFFER",
    GENERIC_FOLLOW_UP = "GENERIC_FOLLOW_UP",
}

// Who the follow-up message goes to: whoever has to act next.
export enum RecipientType {
    HIRING_MANAGER = "hiring_manager",
    CANDIDATE = "candidate",
    INTERVIEW_PANEL = "interview_panel",
    ASSESSMENT_REVIEWER = "assessment_reviewer",
}

// What a team can set on the Hiring stages page.
export const STAGE_LIMITS = {
    MIN_THRESHOLD_DAYS: 1,
    MAX_THRESHOLD_DAYS: 90,
    MAX_NAME_LENGTH: 40,
    MAX_STAGES: 30,
    MAX_ALIASES: 10,
} as const;

// Where the stall timer started.
export enum TimerSource {
    STAGE_ENTERED = "stage_entered_at",
    LAST_ACTIVITY = "last_activity_at",
}
