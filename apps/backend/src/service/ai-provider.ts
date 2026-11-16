import type { AiConfig } from "../config/config";
import { AI_MODEL_LIST, AI_REQUEST, AiErrorCode, ChatRole, FinishReason, ReasoningEffort } from "../constant/ai";
import { RESPONSE_SCHEMA, SYSTEM_PROMPT } from "../constant/ai-prompt";
import { HttpStatus } from "../constant/http";
import { AiModelInterface } from "../model/ai-model";
import { httpRequest } from "../utils/http";
import { InsightFacts } from "./pipeline-messages";

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
    fetchModels(): Promise<AiModelInterface[]>;
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

const parseJson = (content: string): unknown => {
    try {
        return JSON.parse(content);
    } catch {
        throw new AiError(AiErrorCode.INVALID_JSON);
    }
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

    async fetchModels(): Promise<AiModelInterface[]> {
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
        }));
    }

    private async chat(body: Record<string, unknown>): Promise<ChatCompletion> {
        const response = await httpRequest<ChatCompletion>({
            url: `${this.options.baseUrl}${AI_REQUEST.CHAT_PATH}`,
            method: "POST",
            headers: { Authorization: `Bearer ${this.options.apiKey}`, "X-Title": AI_REQUEST.APP_TITLE },
            data: body,
            timeoutMs: this.options.timeoutMs,
        });

        if (response.statusCode !== HttpStatus.OK) {
            const errorCode = STATUS_ERRORS[response.statusCode] ?? AiErrorCode.PROVIDER_ERROR;
            throw new AiError(errorCode, `HTTP ${response.statusCode}`);
        }
        return response.data;
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
