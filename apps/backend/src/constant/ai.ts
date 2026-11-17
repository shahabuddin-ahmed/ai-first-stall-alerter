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
    NOT_IN_TOP_N = "not_in_top_n",
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
    LENGTH = "length",
}

export enum LlmCallStatus {
    SUCCESS = "success",
    FAILED = "failed",
}

export const AI_COLUMN_LIMITS = {
    ERROR_CODE: 20,
    PROMPT_VERSION: 10,
    MODEL_ID: 100,
} as const;

export const SENDER_PLACEHOLDER = "{{recruiter}}";
export const FIRST_NAME_PLACEHOLDER = "{{first_name}}";
export const NAME_PLACEHOLDER = "{{name}}";
export const ROLE_PLACEHOLDER = "{{role}}";

export const DRAFT_PLACEHOLDERS: readonly string[] = [
    FIRST_NAME_PLACEHOLDER,
    NAME_PLACEHOLDER,
    ROLE_PLACEHOLDER,
    SENDER_PLACEHOLDER,
];

// "May" is left out on purpose: "may" is a normal word.
export const TIMING_WORDS =
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|tonight|this week|next week|january|february|march|april|june|july|august|september|october|november|december)\b/i;

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

// Part of the AI cache key: change it when the prompt or the answer checks change, so old saved answers are not reused
export const PROMPT_VERSION = "v6";

export const DEFAULT_AI_MODEL = "inclusionai/ling-3.2-flash:free";

export const AI_MODEL_LIST = {
    PATH: "/models",
    REQUIRED_PARAMETER: "structured_outputs",
    CACHE_MS: 24 * 60 * 60 * 1000,
    PRICE_PER_TOKENS: 1_000_000,
    PRICE_DECIMALS: 4,
    TIMEOUT_MS: 10_000,
} as const;
