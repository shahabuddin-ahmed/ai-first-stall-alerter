import { AI_REQUEST, AiErrorCode, ChatRole, FinishReason, ReasoningEffort, TIMEOUT_ERROR_NAMES } from "../constant/ai";
import { HttpStatus } from "../constant/http";
import { InsightFacts } from "../service/hiring-board/ai-facts";
import { AiError, AiGenerator, GenerationResult } from "./generator";
import { buildUserMessage, RESPONSE_SCHEMA, SYSTEM_PROMPT } from "./prompt";

export interface HttpGeneratorOptions {
    apiKey: string;
    baseUrl: string;
    timeoutMs: number;
    maxOutputTokens: number;
    reasoningEffort: ReasoningEffort;
}

interface ChatCompletion {
    model?: string;
    choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
}

const isTimeout = (err: unknown): boolean => TIMEOUT_ERROR_NAMES.includes((err as Error).name);

export class HttpAiGenerator implements AiGenerator {
    constructor(private options: HttpGeneratorOptions) {}

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

    async generate(facts: InsightFacts, model: string): Promise<GenerationResult> {
        let response: Response;
        try {
            response = await fetch(`${this.options.baseUrl}${AI_REQUEST.CHAT_PATH}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.options.apiKey}`,
                    "Content-Type": "application/json",
                    "X-Title": AI_REQUEST.APP_TITLE,
                },
                body: JSON.stringify({
                    model,
                    temperature: AI_REQUEST.TEMPERATURE,
                    max_tokens: this.options.maxOutputTokens,
                    messages: [
                        { role: ChatRole.SYSTEM, content: SYSTEM_PROMPT },
                        { role: ChatRole.USER, content: buildUserMessage(facts) },
                    ],
                    response_format: {
                        type: AI_REQUEST.RESPONSE_FORMAT,
                        json_schema: { name: AI_REQUEST.SCHEMA_NAME, strict: true, schema: RESPONSE_SCHEMA },
                    },
                    usage: { include: true },
                    ...this.reasoningSetting(),
                }),
                signal: AbortSignal.timeout(this.options.timeoutMs),
            });
        } catch (err) {
            throw isTimeout(err)
                ? new AiError(AiErrorCode.TIMEOUT)
                : new AiError(AiErrorCode.PROVIDER_ERROR, "network error");
        }

        if (response.status === HttpStatus.TOO_MANY_REQUESTS) {
            throw new AiError(AiErrorCode.RATE_LIMITED);
        }
        if (response.status === HttpStatus.UNAUTHORIZED || response.status === HttpStatus.FORBIDDEN) {
            throw new AiError(AiErrorCode.AUTH_FAILED);
        }
        if (response.status === HttpStatus.PAYMENT_REQUIRED) {
            throw new AiError(AiErrorCode.NO_CREDITS);
        }
        if (!response.ok) {
            throw new AiError(AiErrorCode.PROVIDER_ERROR, `HTTP ${response.status}`);
        }

        let body: ChatCompletion;
        try {
            body = (await response.json()) as ChatCompletion;
        } catch (err) {
            throw new AiError(isTimeout(err) ? AiErrorCode.TIMEOUT : AiErrorCode.INVALID_JSON);
        }

        const choice = body.choices?.[0];
        if (choice?.message?.refusal) {
            throw new AiError(AiErrorCode.REFUSED);
        }
        if (choice?.finish_reason === FinishReason.LENGTH) {
            throw new AiError(AiErrorCode.INVALID_OUTPUT, "the answer was cut off");
        }

        let output: unknown;
        try {
            output = JSON.parse(choice?.message?.content ?? "");
        } catch {
            throw new AiError(AiErrorCode.INVALID_JSON);
        }

        return {
            output,
            servedModel: body.model ?? null,
            inputTokens: body.usage?.prompt_tokens ?? null,
            outputTokens: body.usage?.completion_tokens ?? null,
            costUsd: body.usage?.cost ?? null,
        };
    }
}
