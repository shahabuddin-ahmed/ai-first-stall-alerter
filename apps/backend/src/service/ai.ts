import Joi from "joi";
import type { AiConfig } from "../config/config";
import {
    AI_LIMITS,
    AI_MODEL_LIST,
    AiErrorCode,
    DRAFT_PLACEHOLDERS,
    FIRST_NAME_PLACEHOLDER,
    NAME_PLACEHOLDER,
    SENDER_PLACEHOLDER,
    TIMING_WORDS,
} from "../constant/ai";
import { ActionCode, RecipientType } from "../constant/stage";
import logger from "../infra/logger";
import { isTimeoutError } from "../utils/http";
import { ERROR_CODES } from "../constant/error";
import { ServiceUnavailableException } from "../web/exception/service-unavailable-exception";
import { AiError, AiModel, AiProviderInterface, AiUsage, CompletionResult, newAiProvider } from "./ai-provider";
import { ACTIONS, actionsOf, InsightFacts } from "./pipeline-messages";

export interface ActionDraft {
    action_code: ActionCode;
    text: string;
}

export interface AiOutput {
    briefing: string;
    bottleneck_notes: string[];
    drafts: ActionDraft[];
}

export interface AiAttempt {
    output: AiOutput | null;
    errorCode: AiErrorCode | null;
    problems: string[];
    usage: AiUsage;
}

export interface AiServiceInterface {
    isConfigured(): boolean;
    generateText(facts: InsightFacts, model: string): Promise<AiAttempt>;
    listModels(): Promise<AiModel[]>;
    isModelAvailable(modelId: string): Promise<boolean>;
}

const NO_USAGE: AiUsage = { servedModel: null, inputTokens: null, outputTokens: null, costUsd: null };

const errorCodeOf = (err: unknown): AiErrorCode => {
    if (isTimeoutError(err)) {
        return AiErrorCode.TIMEOUT;
    }
    if (err instanceof AiError) {
        return err.code;
    }
    return AiErrorCode.PROVIDER_ERROR;
};

const ANSWER_CHECK_OPTIONS: Joi.ValidationOptions = { abortEarly: false, errors: { wrap: { label: false } } };

const LINK_OR_MARKUP = /https?:\/\/|www\.|<\/?[a-z!][^>]*>|\[[^\]]*\]\([^)]*\)/i;
const PLACEHOLDER = /\{\{[^{}]*\}\}/g;

const answerSchema = (facts: InsightFacts): Joi.ObjectSchema<AiOutput> => {
    const actions = actionsOf(facts);
    return Joi.object<AiOutput>({
        briefing: Joi.string().trim().max(AI_LIMITS.BRIEFING_CHARS).required(),
        bottleneck_notes: Joi.array()
            .items(Joi.string().trim().max(AI_LIMITS.BOTTLENECK_NOTE_CHARS))
            .length(facts.bottlenecks.length)
            .required(),
        drafts: Joi.array()
            .items(
                Joi.object({
                    action_code: Joi.string()
                        .valid(...actions)
                        .required(),
                    text: Joi.string().trim().max(AI_LIMITS.DRAFT_CHARS).required(),
                })
            )
            .unique("action_code")
            .length(actions.length)
            .required(),
    }).label("the answer");
};

const numbersIn = (value: unknown, found = new Set<number>()): Set<number> => {
    if (typeof value === "number") {
        found.add(value);
    } else if (Array.isArray(value)) {
        value.forEach((item) => numbersIn(item, found));
    } else if (value && typeof value === "object") {
        Object.values(value).forEach((item) => numbersIn(item, found));
    }
    return found;
};

const textProblems = (label: string, text: string): string[] => {
    const problems: string[] = [];
    if (LINK_OR_MARKUP.test(text)) {
        problems.push(`${label} contains a link or markup`);
    }
    for (const code of Object.values(ActionCode).filter((code) => text.includes(code))) {
        problems.push(`${label} uses the code ${code} instead of plain words`);
    }
    return problems;
};

const numberProblems = (label: string, text: string, allowed: Set<number>): string[] =>
    (text.match(/\d+/g) ?? [])
        .filter((number) => !allowed.has(Number(number)))
        .map((number) => `${label} uses the number ${number}, which is not in the facts`);

const draftProblems = (label: string, text: string): string[] => {
    const problems: string[] = [];
    const placeholders = text.match(PLACEHOLDER) ?? [];
    const withoutPlaceholders = text.replace(PLACEHOLDER, "");
    for (const placeholder of placeholders.filter((found) => !DRAFT_PLACEHOLDERS.includes(found))) {
        problems.push(`${label} uses an unknown placeholder ${placeholder}`);
    }
    if (placeholders.filter((found) => found === SENDER_PLACEHOLDER).length > 1) {
        problems.push(`${label} uses ${SENDER_PLACEHOLDER} more than once (it is only for the signature)`);
    }
    if (/[{}]/.test(withoutPlaceholders)) {
        problems.push(`${label} has a broken placeholder`);
    }
    if (/\d/.test(withoutPlaceholders)) {
        problems.push(`${label} contains a digit (no dates or day counts in messages)`);
    }
    const timingWord = withoutPlaceholders.match(TIMING_WORDS);
    if (timingWord) {
        problems.push(`${label} promises a time ("${timingWord[0]}")`);
    }
    return problems;
};

const recipientProblems = (label: string, text: string, actionCode: ActionCode): string[] => {
    const forCandidate = ACTIONS[actionCode].recipient === RecipientType.CANDIDATE;
    const usesFirstName = text.includes(FIRST_NAME_PLACEHOLDER);
    const usesName = text.includes(NAME_PLACEHOLDER);

    if (forCandidate && (!usesFirstName || usesName)) {
        return [`${label} goes to the candidate: greet them as ${FIRST_NAME_PLACEHOLDER}, without ${NAME_PLACEHOLDER}`];
    }
    if (!forCandidate && (usesFirstName || !usesName)) {
        return [
            `${label} is not for the candidate: name them as ${NAME_PLACEHOLDER}, without ${FIRST_NAME_PLACEHOLDER}`,
        ];
    }
    return [];
};

const answerProblems = (answer: AiOutput, facts: InsightFacts): string[] => {
    const allowedNumbers = numbersIn(facts);
    const problems = [
        ...textProblems("briefing", answer.briefing),
        ...numberProblems("briefing", answer.briefing, allowedNumbers),
    ];
    answer.bottleneck_notes.forEach((note, index) => {
        const label = `bottleneck note ${index + 1}`;
        problems.push(...textProblems(label, note), ...numberProblems(label, note, allowedNumbers));
    });
    for (const draft of answer.drafts) {
        const label = `draft for ${draft.action_code}`;
        problems.push(
            ...textProblems(label, draft.text),
            ...draftProblems(label, draft.text),
            ...recipientProblems(label, draft.text, draft.action_code)
        );
    }
    return problems;
};

export class AiService implements AiServiceInterface {
    private models: AiModel[] = [];
    private modelsExpireAt = 0;

    constructor(
        private provider: AiProviderInterface,
        private configured: boolean
    ) {}

    isConfigured(): boolean {
        return this.configured;
    }

    async generateText(facts: InsightFacts, model: string): Promise<AiAttempt> {
        let generated: CompletionResult;
        try {
            generated = await this.provider.createCompletion(facts, model);
        } catch (err) {
            return { output: null, errorCode: errorCodeOf(err), problems: [], usage: NO_USAGE };
        }

        const { value: answer, error } = answerSchema(facts).validate(generated.output, ANSWER_CHECK_OPTIONS);
        const problems = error ? error.details.map((detail) => detail.message) : answerProblems(answer, facts);
        if (problems.length > 0) {
            // Only the count: the problem text can quote parts of the AI answer
            logger.warn("AI answer failed the checks", { model, problemCount: problems.length });
            return { output: null, errorCode: AiErrorCode.INVALID_OUTPUT, problems, usage: generated };
        }
        return { output: this.sortDrafts(answer, facts), errorCode: null, problems: [], usage: generated };
    }

    async listModels(): Promise<AiModel[]> {
        if (Date.now() < this.modelsExpireAt) {
            return this.models;
        }
        this.models = await this.loadModels();
        this.modelsExpireAt = Date.now() + AI_MODEL_LIST.CACHE_MS;
        return this.models;
    }

    async isModelAvailable(modelId: string): Promise<boolean> {
        const models = await this.listModels();
        return models.some((model) => model.modelId === modelId);
    }

    private sortDrafts(answer: AiOutput, facts: InsightFacts): AiOutput {
        const order = actionsOf(facts);
        const drafts = [...answer.drafts].sort((a, b) => order.indexOf(a.action_code) - order.indexOf(b.action_code));
        return { ...answer, drafts };
    }

    private async loadModels(): Promise<AiModel[]> {
        try {
            return await this.provider.fetchModels();
        } catch {
            throw new ServiceUnavailableException(
                ERROR_CODES.E_SERVICE_UNAVAILABLE,
                "The AI model list could not be loaded from OpenRouter. Try again later."
            );
        }
    }
}

export const newAiService = async (ai: AiConfig): Promise<AiService> => {
    return new AiService(await newAiProvider(ai), ai.AI_API_KEY !== "");
};
