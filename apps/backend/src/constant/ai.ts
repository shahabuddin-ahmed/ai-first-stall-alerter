// What happened with AI for one insights request.
export enum AiStatus {
    AI_DRAFT = "ai_draft", // AI text was used (fresh or from the cache)
    DISABLED = "disabled", // the team turned "Use AI drafts" off
    NOT_CONFIGURED = "not_configured", // no AI key or model on the server
    FAILED = "failed", // the AI call or its answer failed; templates were used
    NOTHING_STALLED = "nothing_stalled", // no alerts, so no AI call
}

// The AI state of one exported row (spec C8: ai_note_status).
export enum AiNoteStatus {
    AI_DRAFT = "ai_draft", // the message is the AI draft
    DISABLED = "disabled", // the team turned "Use AI drafts" off
    OUTSIDE_AI_SCOPE = "outside_ai_scope", // rank is below the top N, so AI never writes it
    PENDING = "pending", // AI insights were not requested yet for this report
    UNAVAILABLE = "unavailable", // AI is not set up on the server, or the last call failed
}

// Where a piece of text came from.
export enum MessageSource {
    AI_DRAFT = "ai_draft",
    TEMPLATE = "template",
}

// Why an AI call failed. Stored in llm_calls.error_code (never the text itself).
export enum AiErrorCode {
    TIMEOUT = "TIMEOUT",
    RATE_LIMITED = "RATE_LIMITED",
    AUTH_FAILED = "AUTH_FAILED",
    NO_CREDITS = "NO_CREDITS", // the provider account has no credits left (HTTP 402)
    PROVIDER_ERROR = "PROVIDER_ERROR",
    REFUSED = "REFUSED",
    INVALID_JSON = "INVALID_JSON",
    INVALID_OUTPUT = "INVALID_OUTPUT",
}

// AI_MODE: live = call the provider; fake = built-in stand-in with no network (tests, demos).
export enum AiMode {
    LIVE = "live",
    FAKE = "fake",
}

// AI_REASONING_EFFORT: how much a "thinking" model may think before answering.
export enum ReasoningEffort {
    NONE = "none", // do not send the setting (models without thinking)
    OFF = "off", // no thinking: fastest
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
}

// Chat message roles and finish reasons of the OpenAI-compatible API.
export enum ChatRole {
    SYSTEM = "system",
    USER = "user",
}

export enum FinishReason {
    STOP = "stop",
    LENGTH = "length", // the answer was cut off at max_tokens
}

// Error names fetch uses when a request is stopped by its timeout.
export const TIMEOUT_ERROR_NAMES: readonly string[] = ["TimeoutError", "AbortError"];

export enum LlmCallStatus {
    SUCCESS = "success",
    FAILED = "failed",
}

// The only placeholders the AI may use in drafts. The server fills them in.
export const DRAFT_PLACEHOLDERS = ["{{first_name}}", "{{name}}", "{{role}}", "{{recruiter}}"] as const;

export const AI_LIMITS = {
    BRIEFING_CHARS: 450,
    BOTTLENECK_NOTE_CHARS: 220,
    DRAFT_CHARS: 600,
    MAX_PROMPT_BYTES: 8 * 1024,
    TOP_RECRUITERS: 5,
} as const;

// The AI sees recruiters as "R1", "R2"... never their names.
export const RECRUITER_KEY_PREFIX = "R";
export const RECRUITER_KEY_PATTERN = /\bR\d+\b/g;

// The one chat request StallAlert sends (OpenAI-compatible API).
export const AI_REQUEST = {
    CHAT_PATH: "/chat/completions",
    TEMPERATURE: 0.2,
    APP_TITLE: "StallAlert", // OpenRouter shows this name in its usage list
    RESPONSE_FORMAT: "json_schema",
    SCHEMA_NAME: "stall_insights",
} as const;

// Bump when the prompt or the facts change, so old cached answers are not reused.
export const PROMPT_VERSION = "v1";
