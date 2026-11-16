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
import { ActionCode, RecipientType } from "../constant/stage";
import { AiInsightRepoInterface } from "../repo/ai-insight";
import { LlmCallRepoInterface } from "../repo/llm-call";
import { sha256Hex } from "../utils/utility";
import { AiAttempt, AiOutput, AiServiceInterface } from "./ai";
import { ConfigServiceInterface } from "./config";
import { ImportServiceInterface } from "./import";
import {
    buildInsightFacts,
    fillPlaceholders,
    InsightFacts,
    recruiterKeysOf,
    templateBottleneckNote,
    templateBriefing,
} from "./pipeline-messages";
import { PipelineAnalysis, QueueItem } from "./pipeline-types";

export interface InsightDraft {
    rank: number;
    candidateId: string;
    name: string;
    actionCode: ActionCode;
    recipient: RecipientType;
    text: string;
    source: MessageSource;
}

export interface InsightsView {
    importId: number;
    referenceDate: string;
    aiStatus: AiStatus;
    errorCode: AiErrorCode | null;
    model: string | null;
    cached: boolean;
    topN: number;
    briefing: { text: string; source: MessageSource };
    bottleneckNotes: { type: BottleneckType; key: string; stalled: number; text: string; source: MessageSource }[];
    drafts: InsightDraft[];
}

export interface SavedDrafts {
    status: AiNoteStatus.AI_DRAFT | AiNoteStatus.DISABLED | AiNoteStatus.PENDING | AiNoteStatus.UNAVAILABLE;
    draftsByAction: Map<ActionCode, string>;
}

export interface InsightServiceInterface {
    getInsights(importId: number, referenceDate?: string): Promise<InsightsView>;
    getSavedDrafts(importId: number, analysis: PipelineAnalysis): Promise<SavedDrafts>;
}

const savedDrafts = (status: SavedDrafts["status"], draftsByAction = new Map<ActionCode, string>()): SavedDrafts => ({
    status,
    draftsByAction,
});

const toDraft = (item: QueueItem, text: string, source: MessageSource): InsightDraft => ({
    rank: item.rank,
    candidateId: item.candidateId,
    name: item.name,
    actionCode: item.actionCode,
    recipient: item.recipient,
    text,
    source,
});

export class InsightService implements InsightServiceInterface {
    private inFlight = new Map<string, Promise<AiAttempt>>();

    constructor(
        private importService: ImportServiceInterface,
        private configService: ConfigServiceInterface,
        private aiInsightRepo: AiInsightRepoInterface,
        private llmCallRepo: LlmCallRepoInterface,
        private aiService: AiServiceInterface,
        private topN: number
    ) {}

    async getInsights(importId: number, referenceDate?: string): Promise<InsightsView> {
        const { analysis } = await this.importService.analyse(importId, referenceDate);
        const { useAiDrafts, stagesVersion, aiModel } = this.configService.getSnapshot();
        const model = this.aiService.isConfigured() ? aiModel : null;
        const templates = (aiStatus: AiStatus, errorCode: AiErrorCode | null = null) =>
            this.templateView(importId, analysis, model, aiStatus, errorCode);

        if (analysis.queue.length === 0) {
            return templates(AiStatus.NOTHING_STALLED);
        }
        if (!this.aiService.isConfigured()) {
            return templates(AiStatus.NOT_CONFIGURED);
        }
        if (!useAiDrafts) {
            return templates(AiStatus.DISABLED);
        }

        const facts = buildInsightFacts(analysis, this.topN);
        const cacheKey = this.cacheKey(importId, analysis.referenceDate, stagesVersion, aiModel);

        const cached = await this.aiInsightRepo.findByKey(cacheKey);
        if (cached) {
            return this.aiView(importId, analysis, aiModel, cached.output, true);
        }

        const attempt = await this.callOnce(cacheKey, importId, facts, aiModel);
        return attempt.output
            ? this.aiView(importId, analysis, aiModel, attempt.output, false)
            : templates(AiStatus.FAILED, attempt.errorCode);
    }

    async getSavedDrafts(importId: number, analysis: PipelineAnalysis): Promise<SavedDrafts> {
        const { useAiDrafts, stagesVersion, aiModel } = this.configService.getSnapshot();
        if (!this.aiService.isConfigured()) {
            return savedDrafts(AiNoteStatus.UNAVAILABLE);
        }
        if (!useAiDrafts) {
            return savedDrafts(AiNoteStatus.DISABLED);
        }

        const cacheKey = this.cacheKey(importId, analysis.referenceDate, stagesVersion, aiModel);
        const cached = await this.aiInsightRepo.findByKey(cacheKey);
        if (cached) {
            return savedDrafts(
                AiNoteStatus.AI_DRAFT,
                new Map(cached.output.drafts.map((draft) => [draft.action_code, draft.text]))
            );
        }

        const lastCall = await this.llmCallRepo.findLatest(cacheKey);
        return savedDrafts(lastCall?.status === LlmCallStatus.FAILED ? AiNoteStatus.UNAVAILABLE : AiNoteStatus.PENDING);
    }

    cacheKey(importId: number, referenceDate: string, stagesVersion: number, model: string): string {
        const parts = [importId, referenceDate, stagesVersion, this.topN, PROMPT_VERSION, model];
        return sha256Hex(JSON.stringify(parts));
    }

    private callOnce(cacheKey: string, importId: number, facts: InsightFacts, model: string): Promise<AiAttempt> {
        const running = this.inFlight.get(cacheKey);
        if (running) {
            return running;
        }
        const attempt = this.attempt(cacheKey, importId, facts, model).finally(() => this.inFlight.delete(cacheKey));
        this.inFlight.set(cacheKey, attempt);
        return attempt;
    }

    private async attempt(cacheKey: string, importId: number, facts: InsightFacts, model: string): Promise<AiAttempt> {
        const startedAt = Date.now();
        const attempt = await this.aiService.generateText(facts, model);
        const { usage } = attempt;

        await this.llmCallRepo.log({
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
        });
        if (attempt.output) {
            await this.aiInsightRepo.save({
                importId,
                cacheKey,
                model,
                promptVersion: PROMPT_VERSION,
                output: attempt.output,
            });
        }
        return attempt;
    }

    private aiView(
        importId: number,
        analysis: PipelineAnalysis,
        model: string,
        output: AiOutput,
        cached: boolean
    ): InsightsView {
        const names = new Map([...recruiterKeysOf(analysis.queue)].map(([name, key]) => [key, name]));
        const withNames = (text: string) => text.replace(RECRUITER_KEY_PATTERN, (key) => names.get(key) ?? key);
        const draftByAction = new Map(output.drafts.map((draft) => [draft.action_code, draft.text]));

        return {
            importId,
            referenceDate: analysis.referenceDate,
            aiStatus: AiStatus.AI_DRAFT,
            errorCode: null,
            model,
            cached,
            topN: this.topN,
            briefing: { text: withNames(output.briefing), source: MessageSource.AI_DRAFT },
            bottleneckNotes: analysis.bottlenecks.map((bottleneck, index) => ({
                ...bottleneck,
                text: withNames(output.bottleneck_notes[index]),
                source: MessageSource.AI_DRAFT,
            })),
            drafts: analysis.queue
                .slice(0, this.topN)
                .map((item) =>
                    toDraft(
                        item,
                        fillPlaceholders(draftByAction.get(item.actionCode) as string, item),
                        MessageSource.AI_DRAFT
                    )
                ),
        };
    }

    private templateView(
        importId: number,
        analysis: PipelineAnalysis,
        model: string | null,
        aiStatus: AiStatus,
        errorCode: AiErrorCode | null
    ): InsightsView {
        return {
            importId,
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
            drafts: analysis.queue
                .slice(0, this.topN)
                .map((item) => toDraft(item, item.templateMessage, MessageSource.TEMPLATE)),
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
