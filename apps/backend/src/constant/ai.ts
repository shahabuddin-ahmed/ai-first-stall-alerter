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

export const AI_COLUMN_LIMITS = {
    ERROR_CODE: 20,
    PROMPT_VERSION: 10,
    MODEL_ID: 100,
    MODEL_NAME: 100,
} as const;

export enum LlmCallStatus {
    SUCCESS = "success",
    FAILED = "failed",
}

export const SENDER_PLACEHOLDER = "{{recruiter}}";

export const DRAFT_PLACEHOLDERS: readonly string[] = ["{{first_name}}", "{{name}}", "{{role}}", SENDER_PLACEHOLDER];

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

export const PROMPT_VERSION = "v5";

export const DEFAULT_AI_MODEL = "inclusionai/ling-3.2-flash:free";

export const AI_MODEL_LIST = {
    PATH: "/models",
    REQUIRED_PARAMETER: "structured_outputs",
    CACHE_MS: 30 * 60 * 1000,
    TIMEOUT_MS: 10000,
} as const;
