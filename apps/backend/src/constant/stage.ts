export enum StageType {
    WATCHED = "watched",
    PAUSED = "paused",
    FINAL = "final",
}

export enum ActionCode {
    REVIEW_APPLICATION = "REVIEW_APPLICATION",
    SCHEDULE_SCREEN = "SCHEDULE_SCREEN",
    REQUEST_FEEDBACK = "REQUEST_FEEDBACK",
    REVIEW_ASSESSMENT = "REVIEW_ASSESSMENT",
    CHASE_REFERENCES = "CHASE_REFERENCES",
    CONFIRM_OFFER = "CONFIRM_OFFER",
    GENERIC_FOLLOW_UP = "GENERIC_FOLLOW_UP",
}

export enum RecipientType {
    HIRING_MANAGER = "hiring_manager",
    CANDIDATE = "candidate",
    INTERVIEW_PANEL = "interview_panel",
    ASSESSMENT_REVIEWER = "assessment_reviewer",
}

export const STAGE_LIMITS = {
    MIN_THRESHOLD_DAYS: 1,
    MAX_THRESHOLD_DAYS: 90,
    MAX_NAME_LENGTH: 40,
    MAX_STAGES: 30,
    MAX_ALIASES: 10,
} as const;

export enum TimerSource {
    STAGE_ENTERED = "stage_entered_at",
    LAST_ACTIVITY = "last_activity_at",
}
