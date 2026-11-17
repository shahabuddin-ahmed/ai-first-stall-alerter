import { SettingStatus } from "../constant/setting";
import {
    AiErrorCode,
    AiNoteStatus,
    AiStatus,
    LlmCallStatus,
    MessageSource,
    PROMPT_VERSION,
    RECRUITER_KEY_PATTERN,
} from "../constant/ai";
import { BottleneckType } from "../constant/pipeline";
import { ActionCode } from "../constant/stage";
import logger from "../infra/logger";
import { AiInsightRepoInterface } from "../repo/ai-insight";
import { LlmCallRepoInterface } from "../repo/llm-call";
import { sha256Hex } from "../utils/utility";
import { AiAttempt, AiOutput, AiServiceInterface } from "./ai";
import { ConfigServiceInterface } from "./config";
import { ImportServiceInterface } from "./import";
import {
    buildInsightFacts,
    InsightFacts,
    recruiterKeysOf,
    templateBottleneckNote,
    templateBriefing,
} from "./pipeline-messages";
import { PipelineAnalysis } from "./pipeline-types";

// One AI message per follow-up action, with {{first_name}}, {{name}}, {{role}} and {{recruiter}} still in it.
// Every queue row with that action uses it, filled with the row's own details.
export interface ActionMessage {
    actionCode: ActionCode;
    text: string;
}

export interface InsightsView {
    referenceDate: string;
    aiStatus: AiStatus;
    errorCode: AiErrorCode | null;
    model: string | null;
    cached: boolean;
    topN: number;
    briefing: { text: string; source: MessageSource };
    bottleneckNotes: { type: BottleneckType; key: string; stalled: number; text: string; source: MessageSource }[];
    actionMessages: ActionMessage[];
}

export interface SavedDrafts {
    status: AiNoteStatus.AI_DRAFT | AiNoteStatus.DISABLED | AiNoteStatus.PENDING | AiNoteStatus.UNAVAILABLE;
    draftsByAction: Map<ActionCode, string>;
}

interface InsightResult {
    output: AiOutput | null;
    errorCode: AiErrorCode | null;
    cached: boolean;
}

export interface InsightServiceInterface {
    getInsights(publicId: string, referenceDate?: string, retry?: boolean): Promise<InsightsView>;
    getSavedDrafts(importId: number, analysis: PipelineAnalysis): Promise<SavedDrafts>;
}

// A part that failed its checks is null: show its template instead
const aiOrTemplate = (
    aiText: string | null,
    templateText: string,
    withNames: (text: string) => string
): { text: string; source: MessageSource } =>
    aiText === null
        ? { text: templateText, source: MessageSource.TEMPLATE }
        : { text: withNames(aiText), source: MessageSource.AI_DRAFT };

export class InsightService implements InsightServiceInterface {
    private inFlight = new Map<string, Promise<InsightResult>>();

    constructor(
        private importService: ImportServiceInterface,
        private configService: ConfigServiceInterface,
        private aiInsightRepo: AiInsightRepoInterface,
        private llmCallRepo: LlmCallRepoInterface,
        private aiService: AiServiceInterface,
        private topN: number
    ) {}

    async getInsights(publicId: string, referenceDate?: string, retry = false): Promise<InsightsView> {
        const importId = await this.importService.resolveId(publicId);
        const { analysis } = await this.importService.analyse(importId, referenceDate);
        const { status, stagesVersion, aiModel } = this.configService.getSnapshot();
        const model = this.aiService.isConfigured() ? aiModel : null;
        const templates = (aiStatus: AiStatus, errorCode: AiErrorCode | null = null) =>
            this.templateView(analysis, model, aiStatus, errorCode);

        if (analysis.queue.length === 0) {
            return templates(AiStatus.NOTHING_STALLED);
        }
        if (!this.aiService.isConfigured()) {
            return templates(AiStatus.NOT_CONFIGURED);
        }
        if (status !== SettingStatus.ACTIVE) {
            return templates(AiStatus.DISABLED);
        }

        const facts = buildInsightFacts(analysis, this.topN);
        const cacheKey = this.cacheKey(importId, analysis.referenceDate, stagesVersion, aiModel);

        const result = await this.callOnce(cacheKey, importId, facts, aiModel, retry);
        return result.output
            ? this.aiView(analysis, aiModel, result.output, result.cached)
            : templates(AiStatus.FAILED, result.errorCode);
    }

    async getSavedDrafts(importId: number, analysis: PipelineAnalysis): Promise<SavedDrafts> {
        const { status, stagesVersion, aiModel } = this.configService.getSnapshot();
        if (!this.aiService.isConfigured()) {
            return this.savedDrafts(AiNoteStatus.UNAVAILABLE);
        }
        if (status !== SettingStatus.ACTIVE) {
            return this.savedDrafts(AiNoteStatus.DISABLED);
        }

        const cacheKey = this.cacheKey(importId, analysis.referenceDate, stagesVersion, aiModel);
        const cached = await this.aiInsightRepo.findByKey(cacheKey);
        if (cached) {
            return this.savedDrafts(
                AiNoteStatus.AI_DRAFT,
                new Map(cached.output.drafts.map((draft) => [draft.action_code, draft.text]))
            );
        }

        const lastCall = await this.llmCallRepo.findLatest(cacheKey);
        return this.savedDrafts(
            lastCall?.status === LlmCallStatus.FAILED ? AiNoteStatus.UNAVAILABLE : AiNoteStatus.PENDING
        );
    }

    cacheKey(importId: number, referenceDate: string, stagesVersion: number, model: string): string {
        const parts = [importId, referenceDate, stagesVersion, this.topN, PROMPT_VERSION, model];
        return sha256Hex(JSON.stringify(parts));
    }

    private savedDrafts(status: SavedDrafts["status"], draftsByAction = new Map<ActionCode, string>()): SavedDrafts {
        return { status, draftsByAction };
    }

    private callOnce(
        cacheKey: string,
        importId: number,
        facts: InsightFacts,
        model: string,
        retry: boolean
    ): Promise<InsightResult> {
        const running = this.inFlight.get(cacheKey);
        if (running) {
            return running;
        }
        const result = this.loadOrGenerate(cacheKey, importId, facts, model, retry).finally(() =>
            this.inFlight.delete(cacheKey)
        );
        this.inFlight.set(cacheKey, result);
        return result;
    }

    private async loadOrGenerate(
        cacheKey: string,
        importId: number,
        facts: InsightFacts,
        model: string,
        retry: boolean
    ): Promise<InsightResult> {
        const cached = await this.aiInsightRepo.findByKey(cacheKey);
        if (cached) {
            return { output: cached.output, errorCode: null, cached: true };
        }
        // A failed try is not repeated on its own: only a Retry asks the AI again
        if (!retry) {
            const lastCall = await this.llmCallRepo.findLatest(cacheKey);
            if (lastCall?.status === LlmCallStatus.FAILED) {
                return { output: null, errorCode: lastCall.errorCode, cached: false };
            }
        }
        const attempt = await this.attempt(cacheKey, importId, facts, model);
        return { output: attempt.output, errorCode: attempt.errorCode, cached: false };
    }

    private async attempt(cacheKey: string, importId: number, facts: InsightFacts, model: string): Promise<AiAttempt> {
        const startedAt = Date.now();
        const attempt = await this.aiService.generateText(facts, model);
        const { usage } = attempt;

        await this.saveSafely("the AI call log", () =>
            this.llmCallRepo.log({
                importId,
                cacheKey,
                requestedModel: model,
                servedModel: usage.servedModel,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                costUsd: usage.costUsd,
                latencyMs: Date.now() - startedAt,
                status: attempt.output ? LlmCallStatus.SUCCESS : LlmCallStatus.FAILED,
                errorCode: attempt.errorCode,
            })
        );
        if (attempt.output) {
            const output = attempt.output;
            await this.saveSafely("the AI answer", () =>
                this.aiInsightRepo.save({ importId, cacheKey, model, promptVersion: PROMPT_VERSION, output })
            );
        }
        return attempt;
    }

    // The AI answer is already here, so a failed save (e.g. the import was just deleted) must not turn it into an error.
    // The error name only: database errors can contain row values.
    private async saveSafely(what: string, save: () => Promise<unknown>): Promise<void> {
        try {
            await save();
        } catch (err) {
            logger.warn(`Could not save ${what}`, { error: err instanceof Error ? err.name : "Error" });
        }
    }

    private aiView(
        analysis: PipelineAnalysis,
        model: string,
        output: AiOutput,
        cached: boolean
    ): InsightsView {
        const names = new Map([...recruiterKeysOf(analysis.queue)].map(([name, key]) => [key, name]));
        const withNames = (text: string) => text.replace(RECRUITER_KEY_PATTERN, (key) => names.get(key) ?? key);

        return {
            referenceDate: analysis.referenceDate,
            aiStatus: AiStatus.AI_DRAFT,
            errorCode: null,
            model,
            cached,
            topN: this.topN,
            briefing: aiOrTemplate(output.briefing, templateBriefing(analysis), withNames),
            bottleneckNotes: analysis.bottlenecks.map((bottleneck, index) => ({
                ...bottleneck,
                ...aiOrTemplate(output.bottleneck_notes[index], templateBottleneckNote(bottleneck), withNames),
            })),
            actionMessages: output.drafts.map((draft) => ({ actionCode: draft.action_code, text: draft.text })),
        };
    }

    private templateView(
        analysis: PipelineAnalysis,
        model: string | null,
        aiStatus: AiStatus,
        errorCode: AiErrorCode | null
    ): InsightsView {
        return {
            referenceDate: analysis.referenceDate,
            aiStatus,
            errorCode,
            model,
            cached: false,
            topN: this.topN,
            briefing: { text: templateBriefing(analysis), source: MessageSource.TEMPLATE },
            bottleneckNotes: analysis.bottlenecks.map((bottleneck) => ({
                ...bottleneck,
                text: templateBottleneckNote(bottleneck),
                source: MessageSource.TEMPLATE,
            })),
            actionMessages: [],
        };
    }
}

export const newInsightService = async (
    importService: ImportServiceInterface,
    configService: ConfigServiceInterface,
    aiInsightRepo: AiInsightRepoInterface,
    llmCallRepo: LlmCallRepoInterface,
    aiService: AiServiceInterface,
    topN: number
): Promise<InsightService> => {
    return new InsightService(importService, configService, aiInsightRepo, llmCallRepo, aiService, topN);
};
