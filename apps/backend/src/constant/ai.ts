export enum AiStatus {
    AI_DRAFT = "ai_draft",
    DISABLED = "disabled",
    NOT_CONFIGURED = "not_configured",
    FAILED = "failed",
    NOTHING_STALLED = "nothing_stalled",
}

export enum AiNoteStatus {
    AI_DRAFT = "ai_draft",
    DISABLED = "disabled",
    OUTSIDE_AI_SCOPE = "outside_ai_scope",
    PENDING = "pending",
    UNAVAILABLE = "unavailable",
}

export enum MessageSource {
    AI_DRAFT = "ai_draft",
    TEMPLATE = "template",
}

export enum AiErrorCode {
    TIMEOUT = "TIMEOUT",
    RATE_LIMITED = "RATE_LIMITED",
    AUTH_FAILED = "AUTH_FAILED",
    NO_CREDITS = "NO_CREDITS",
    PROVIDER_ERROR = "PROVIDER_ERROR",
    REFUSED = "REFUSED",
    INVALID_JSON = "INVALID_JSON",
    INVALID_OUTPUT = "INVALID_OUTPUT",
}

export enum AiMode {
    LIVE = "live",
    FAKE = "fake",
}

export enum ReasoningEffort {
    NONE = "none",
    OFF = "off",
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
}

export enum ChatRole {
    SYSTEM = "system",
    USER = "user",
}

export enum FinishReason {
    STOP = "stop",
    LENGTH = "length",
}

export const TIMEOUT_ERROR_NAMES: readonly string[] = ["TimeoutError", "AbortError"];

export enum LlmCallStatus {
    SUCCESS = "success",
    FAILED = "failed",
}

export const DRAFT_PLACEHOLDERS = ["{{first_name}}", "{{name}}", "{{role}}", "{{recruiter}}"] as const;

export const AI_LIMITS = {
    BRIEFING_CHARS: 450,
    BOTTLENECK_NOTE_CHARS: 220,
    DRAFT_CHARS: 600,
    MAX_PROMPT_BYTES: 8 * 1024,
    TOP_RECRUITERS: 5,
} as const;

export const RECRUITER_KEY_PREFIX = "R";
export const RECRUITER_KEY_PATTERN = /\bR\d+\b/g;

export const AI_REQUEST = {
    CHAT_PATH: "/chat/completions",
    TEMPERATURE: 0.2,
    APP_TITLE: "StallAlert",
    RESPONSE_FORMAT: "json_schema",
    SCHEMA_NAME: "stall_insights",
} as const;

export const PROMPT_VERSION = "v1";
