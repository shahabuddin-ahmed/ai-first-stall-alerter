import type { AiConfig } from "../config/config";
import { AI_MODEL_LIST, AI_REQUEST, AI_RETRY, AiErrorCode, ChatRole, FinishReason, ReasoningEffort } from "../constant/ai";
import { RESPONSE_SCHEMA, SYSTEM_PROMPT } from "../constant/ai-prompt";
import { HttpStatus } from "../constant/http";
import logger from "../infra/logger";
import { httpRequest, HttpResponse, isConnectionError } from "../utils/http";
import { InsightFacts } from "./pipeline-messages";

export interface AiModel {
    modelId: string;
    name: string;
    contextLength: number | null;
    // USD per 1M tokens; null when the provider gives no fixed price
    inputPrice: number | null;
    outputPrice: number | null;
}

export interface AiUsage {
    servedModel: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: number | null;
}

export interface CompletionResult extends AiUsage {
    output: unknown;
}

export interface AiProviderInterface {
    createCompletion(facts: InsightFacts, model: string): Promise<CompletionResult>;
    fetchModels(): Promise<AiModel[]>;
}

export class AiError extends Error {
    constructor(
        public readonly code: AiErrorCode,
        message?: string
    ) {
        super(message ?? code);
        this.name = "AiError";
    }
}

interface ChatCompletion {
    model?: string;
    choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
}

interface OpenRouterModel {
    id: string;
    name: string;
    context_length?: number | null;
    supported_parameters?: string[];
    pricing?: { prompt?: string; completion?: string };
}

export interface OpenRouterOptions {
    apiKey: string;
    baseUrl: string;
    timeoutMs: number;
    maxOutputTokens: number;
    reasoningEffort: ReasoningEffort;
}

const STATUS_ERRORS: Record<number, AiErrorCode> = {
    [HttpStatus.TOO_MANY_REQUESTS]: AiErrorCode.RATE_LIMITED,
    [HttpStatus.UNAUTHORIZED]: AiErrorCode.AUTH_FAILED,
    [HttpStatus.FORBIDDEN]: AiErrorCode.AUTH_FAILED,
    [HttpStatus.PAYMENT_REQUIRED]: AiErrorCode.NO_CREDITS,
};

const RETRY_STATUSES: number[] = [
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.BAD_GATEWAY,
    HttpStatus.SERVICE_UNAVAILABLE,
    HttpStatus.GATEWAY_TIMEOUT,
];

const MS_PER_SECOND = 1000;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// 0.5 s, then 1 s, plus a little random time so many servers do not retry at the same moment.
// A rate limit's Retry-After (in seconds) wins, up to 10 s.
const retryDelayMs = (attempt: number, retryAfter?: string): number => {
    const seconds = Number(retryAfter);
    if (retryAfter !== undefined && Number.isFinite(seconds) && seconds >= 0) {
        return Math.min(seconds * MS_PER_SECOND, AI_RETRY.MAX_RETRY_AFTER_MS);
    }
    return AI_RETRY.BASE_DELAY_MS * 2 ** attempt + Math.random() * AI_RETRY.MAX_JITTER_MS;
};

const failureOf = (response: HttpResponse<ChatCompletion> | null): AiError => {
    if (response === null) {
        return new AiError(AiErrorCode.CONNECTION_FAILED);
    }
    const errorCode = STATUS_ERRORS[response.statusCode] ?? AiErrorCode.PROVIDER_ERROR;
    return new AiError(errorCode, `HTTP ${response.statusCode}`);
};

const parseJson = (content: string): unknown => {
    try {
        return JSON.parse(content);
    } catch {
        throw new AiError(AiErrorCode.INVALID_JSON);
    }
};

// OpenRouter sends USD per token as text; a negative or missing value means no fixed price
const pricePerMillion = (perToken?: string): number | null => {
    const value = Number(perToken);
    if (perToken === undefined || !Number.isFinite(value) || value < 0) {
        return null;
    }
    return Number((value * AI_MODEL_LIST.PRICE_PER_TOKENS).toFixed(AI_MODEL_LIST.PRICE_DECIMALS));
};

const supportsJsonOutput = (model: OpenRouterModel): boolean =>
    (model.supported_parameters ?? []).includes(AI_MODEL_LIST.REQUIRED_PARAMETER);

export class OpenRouterProvider implements AiProviderInterface {
    constructor(private options: OpenRouterOptions) {}

    async createCompletion(facts: InsightFacts, model: string): Promise<CompletionResult> {
        const data = await this.chat({
            model,
            temperature: AI_REQUEST.TEMPERATURE,
            max_tokens: this.options.maxOutputTokens,
            messages: [
                { role: ChatRole.SYSTEM, content: SYSTEM_PROMPT },
                { role: ChatRole.USER, content: JSON.stringify(facts) },
            ],
            response_format: {
                type: AI_REQUEST.RESPONSE_FORMAT,
                json_schema: { name: AI_REQUEST.SCHEMA_NAME, strict: true, schema: RESPONSE_SCHEMA },
            },
            usage: { include: true },
            ...this.reasoningSetting(),
        });

        const choice = data.choices?.[0];
        if (choice?.message?.refusal) {
            throw new AiError(AiErrorCode.REFUSED);
        }

        if (choice?.finish_reason === FinishReason.LENGTH) {
            throw new AiError(AiErrorCode.INVALID_OUTPUT, "the answer was cut off");
        }

        return {
            output: parseJson(choice?.message?.content ?? ""),
            servedModel: data.model ?? null,
            inputTokens: data.usage?.prompt_tokens ?? null,
            outputTokens: data.usage?.completion_tokens ?? null,
            costUsd: data.usage?.cost ?? null,
        };
    }

    async fetchModels(): Promise<AiModel[]> {
        const response = await httpRequest<{ data?: OpenRouterModel[] }>({
            url: `${this.options.baseUrl}${AI_MODEL_LIST.PATH}`,
            timeoutMs: AI_MODEL_LIST.TIMEOUT_MS,
        });

        if (response.statusCode !== HttpStatus.OK) {
            throw new Error(`HTTP ${response.statusCode}`);
        }

        return (response.data.data ?? []).filter(supportsJsonOutput).map((model) => ({
            modelId: model.id,
            name: model.name,
            contextLength: model.context_length ?? null,
            inputPrice: pricePerMillion(model.pricing?.prompt),
            outputPrice: pricePerMillion(model.pricing?.completion),
        }));
    }

    // At most 3 tries in all, sharing one deadline (the AI timeout), so retries never make the user wait longer
    private async chat(body: Record<string, unknown>): Promise<ChatCompletion> {
        const deadline = Date.now() + this.options.timeoutMs;
        let attempt = 0;
        while (true) {
            const response = await this.send(body, deadline);
            if (response?.statusCode === HttpStatus.OK) {
                return response.data;
            }
            const retryable = response === null || RETRY_STATUSES.includes(response.statusCode);
            const delay = retryDelayMs(attempt, response?.headers["retry-after"]);
            if (!retryable || !this.canRetry(attempt, delay, deadline)) {
                throw failureOf(response);
            }
            logger.warn("Retrying the AI request", { attempt: attempt + 1, statusCode: response?.statusCode ?? null });
            await wait(delay);
            attempt += 1;
        }
    }

    // null: the connection failed before the request reached the provider (for example a dead reused connection),
    // so sending again cannot charge twice
    private async send(body: Record<string, unknown>, deadline: number): Promise<HttpResponse<ChatCompletion> | null> {
        try {
            return await httpRequest<ChatCompletion>({
                url: `${this.options.baseUrl}${AI_REQUEST.CHAT_PATH}`,
                method: "POST",
                headers: { Authorization: `Bearer ${this.options.apiKey}`, "X-Title": AI_REQUEST.APP_TITLE },
                data: body,
                timeoutMs: Math.max(deadline - Date.now(), 1),
            });
        } catch (err) {
            if (isConnectionError(err)) {
                return null;
            }
            throw err;
        }
    }

    private canRetry(attempt: number, delay: number, deadline: number): boolean {
        return attempt < AI_RETRY.MAX_RETRIES && Date.now() + delay + AI_RETRY.MIN_TIME_LEFT_MS < deadline;
    }

    private reasoningSetting(): { reasoning?: Record<string, unknown> } {
        const effort = this.options.reasoningEffort;
        if (effort === ReasoningEffort.NONE) {
            return {};
        }

        if (effort === ReasoningEffort.OFF) {
            return { reasoning: { enabled: false } };
        }
        return { reasoning: { effort, exclude: true } };
    }
}

export const newAiProvider = async (ai: AiConfig): Promise<AiProviderInterface> => {
    return new OpenRouterProvider({
        apiKey: ai.AI_API_KEY,
        baseUrl: ai.AI_BASE_URL,
        timeoutMs: ai.AI_TIMEOUT_MS,
        maxOutputTokens: ai.AI_MAX_OUTPUT_TOKENS,
        reasoningEffort: ai.AI_REASONING_EFFORT,
    });
};
