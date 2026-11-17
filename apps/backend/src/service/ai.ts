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

// A part that failed its checks is null (or left out, for drafts): the screen uses its template instead
export interface AiOutput {
    briefing: string | null;
    bottleneck_notes: (string | null)[];
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
        briefing: Joi.string().trim().required(),
        bottleneck_notes: Joi.array()
            .items(Joi.string().trim())
            .length(facts.bottlenecks.length)
            .required(),
        drafts: Joi.array()
            .items(
                Joi.object({
                    action_code: Joi.string()
                        .valid(...actions)
                        .required(),
                    text: Joi.string().trim().required(),
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

const textProblems = (label: string, text: string, maxChars: number): string[] => {
    const problems: string[] = [];
    if (text.length > maxChars) {
        problems.push(`${label} is longer than ${maxChars} characters`);
    }
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

interface CheckedAnswer {
    output: AiOutput;
    problems: string[];
    // Only our own labels, such as "draft for CONFIRM_OFFER": safe to log, unlike the problems that quote the AI text
    failedParts: string[];
}

// Each part is checked on its own: a part that breaks a rule is dropped, the good parts are kept
const checkParts = (answer: AiOutput, facts: InsightFacts): CheckedAnswer => {
    const allowedNumbers = numbersIn(facts);
    const proseProblems = (label: string, text: string, maxChars: number) => [
        ...textProblems(label, text, maxChars),
        ...numberProblems(label, text, allowedNumbers),
    ];

    const briefingProblems = proseProblems("briefing", answer.briefing as string, AI_LIMITS.BRIEFING_CHARS);
    const noteProblems = answer.bottleneck_notes.map((note, index) =>
        proseProblems(`bottleneck note ${index + 1}`, note as string, AI_LIMITS.BOTTLENECK_NOTE_CHARS)
    );
    const draftProblemsList = answer.drafts.map((draft) => {
        const label = `draft for ${draft.action_code}`;
        return [
            ...textProblems(label, draft.text, AI_LIMITS.DRAFT_CHARS),
            ...draftProblems(label, draft.text),
            ...recipientProblems(label, draft.text, draft.action_code),
        ];
    });

    return {
        output: {
            briefing: briefingProblems.length > 0 ? null : answer.briefing,
            bottleneck_notes: answer.bottleneck_notes.map((note, index) => (noteProblems[index].length > 0 ? null : note)),
            drafts: answer.drafts.filter((_draft, index) => draftProblemsList[index].length === 0),
        },
        problems: [...briefingProblems, ...noteProblems.flat(), ...draftProblemsList.flat()],
        failedParts: [
            ...(briefingProblems.length > 0 ? ["briefing"] : []),
            ...noteProblems.flatMap((problems, index) => (problems.length > 0 ? [`bottleneck note ${index + 1}`] : [])),
            ...answer.drafts.flatMap((draft, index) =>
                draftProblemsList[index].length > 0 ? [`draft for ${draft.action_code}`] : []
            ),
        ],
    };
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

        // A broken shape (missing parts, unknown action codes) cannot be used at all
        const { value: answer, error } = answerSchema(facts).validate(generated.output, ANSWER_CHECK_OPTIONS);
        if (error) {
            const problems = error.details.map((detail) => detail.message);
            logger.warn("AI answer has the wrong shape", { model, problemCount: problems.length });
            return { output: null, errorCode: AiErrorCode.INVALID_OUTPUT, problems, usage: generated };
        }

        const { output, problems, failedParts } = checkParts(answer, facts);
        if (failedParts.length > 0) {
            logger.warn("Some AI parts failed the checks and use templates", { model, failedParts: failedParts.join(", ") });
        }
        if (output.briefing === null && output.drafts.length === 0) {
            return { output: null, errorCode: AiErrorCode.INVALID_OUTPUT, problems, usage: generated };
        }
        return { output: this.sortDrafts(output, facts), errorCode: null, problems, usage: generated };
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
