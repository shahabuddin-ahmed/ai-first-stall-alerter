import {
    AiErrorCode,
    AiNoteStatus,
    AiStatus,
    LlmCallStatus,
    MessageSource,
    PROMPT_VERSION,
    RECRUITER_KEY_PATTERN,
} from "../constant/ai";
import { ActionCode, RecipientType } from "../constant/stage";
import { AiError, AiGenerator, AiUsage } from "../ai/generator";
import { AiOutput, checkAiOutput } from "../ai/guardrails";
import { AiInsightRepoInterface } from "../repo/ai-insight";
import { LlmCallRepoInterface } from "../repo/llm-call";
import { buildInsightFacts, InsightFacts, recruiterKeysOf } from "../rules/ai-facts";
import { fillPlaceholders, templateBottleneckNote, templateBriefing } from "../rules/messages";
import { BoardAnalysis } from "../rules/types";
import logger from "../infra/logger";
import { sha256Hex } from "../utils/utility";
import { ConfigServiceInterface } from "./config";
import { ImportServiceInterface } from "./import";
import { BottleneckType } from "../constant/board";

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
    getSavedDrafts(importId: number, analysis: BoardAnalysis): Promise<SavedDrafts>;
}

type Attempt = { ok: true; output: AiOutput } | { ok: false; code: AiErrorCode };

export class InsightService implements InsightServiceInterface {
    private inFlight = new Map<string, Promise<Attempt>>();

    constructor(
        private importService: ImportServiceInterface,
        private configService: ConfigServiceInterface,
        private aiInsightRepo: AiInsightRepoInterface,
        private llmCallRepo: LlmCallRepoInterface,
        private generator: AiGenerator | null,
        private topN: number
    ) {}

    async getInsights(importId: number, referenceDate?: string): Promise<InsightsView> {
        const { analysis } = await this.importService.analyse(importId, referenceDate);
        const { useAiDrafts, stagesVersion } = this.configService.getSnapshot();
        const templates = (aiStatus: AiStatus, errorCode: AiErrorCode | null = null) =>
            this.templateView(importId, analysis, aiStatus, errorCode);

        if (analysis.queue.length === 0) {
            return templates(AiStatus.NOTHING_STALLED);
        }
        if (!this.generator) {
            return templates(AiStatus.NOT_CONFIGURED);
        }
        if (!useAiDrafts) {
            return templates(AiStatus.DISABLED);
        }

        const facts = buildInsightFacts(analysis, this.topN);
        const cacheKey = this.cacheKey(importId, analysis.referenceDate, stagesVersion);

        const cached = await this.aiInsightRepo.findByKey(cacheKey);
        if (cached) {
            return this.aiView(importId, analysis, cached, true);
        }

        const attempt = await this.callOnce(cacheKey, importId, facts);
        return attempt.ok
            ? this.aiView(importId, analysis, attempt.output, false)
            : templates(AiStatus.FAILED, attempt.code);
    }

    async getSavedDrafts(importId: number, analysis: BoardAnalysis): Promise<SavedDrafts> {
        const saved = (status: SavedDrafts["status"], draftsByAction = new Map<ActionCode, string>()): SavedDrafts => ({
            status,
            draftsByAction,
        });
        const { useAiDrafts, stagesVersion } = this.configService.getSnapshot();
        if (!this.generator) {
            return saved(AiNoteStatus.UNAVAILABLE);
        }
        if (!useAiDrafts) {
            return saved(AiNoteStatus.DISABLED);
        }

        const cacheKey = this.cacheKey(importId, analysis.referenceDate, stagesVersion);
        const cached = await this.aiInsightRepo.findByKey(cacheKey);
        if (cached) {
            return saved(AiNoteStatus.AI_DRAFT, new Map(cached.drafts.map((draft) => [draft.action_code, draft.text])));
        }

        const lastCall = await this.llmCallRepo.findLatest(cacheKey);
        return saved(lastCall?.status === LlmCallStatus.FAILED ? AiNoteStatus.UNAVAILABLE : AiNoteStatus.PENDING);
    }

    cacheKey(importId: number, referenceDate: string, stagesVersion: number): string {
        const parts = [importId, referenceDate, stagesVersion, this.topN, PROMPT_VERSION, this.model ?? ""];
        return sha256Hex(JSON.stringify(parts));
    }

    private get model(): string | null {
        return this.generator?.model ?? null;
    }

    private callOnce(cacheKey: string, importId: number, facts: InsightFacts): Promise<Attempt> {
        const running = this.inFlight.get(cacheKey);
        if (running) {
            return running;
        }
        const attempt = this.attemptAndForget(cacheKey, importId, facts);
        this.inFlight.set(cacheKey, attempt);
        return attempt;
    }

    private async attemptAndForget(cacheKey: string, importId: number, facts: InsightFacts): Promise<Attempt> {
        try {
            return await this.attempt(cacheKey, importId, facts);
        } finally {
            this.inFlight.delete(cacheKey);
        }
    }

    private async attempt(cacheKey: string, importId: number, facts: InsightFacts): Promise<Attempt> {
        const generator = this.generator as AiGenerator;
        const startedAt = Date.now();
        let result: Attempt;
        let usage: AiUsage = {
            servedModel: null,
            inputTokens: null,
            outputTokens: null,
            costUsd: null,
        };

        try {
            const generated = await generator.generate(facts);
            usage = generated;
            const check = checkAiOutput(generated.output, facts);
            if (check.ok) {
                result = { ok: true, output: check.output };
            } else {
                logger.warn("AI answer failed the checks", { problems: check.problems.join("; ") });
                result = { ok: false, code: AiErrorCode.INVALID_OUTPUT };
            }
        } catch (err) {
            result = { ok: false, code: err instanceof AiError ? err.code : AiErrorCode.PROVIDER_ERROR };
        }

        await this.safely("log the AI call", () =>
            this.llmCallRepo.log({
                importId,
                cacheKey,
                requestedModel: generator.model,
                servedModel: usage.servedModel,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                costUsd: usage.costUsd,
                latencyMs: Date.now() - startedAt,
                status: result.ok ? LlmCallStatus.SUCCESS : LlmCallStatus.FAILED,
                errorCode: result.ok ? null : result.code,
            })
        );
        if (result.ok) {
            const { output } = result;
            await this.safely("cache the AI answer", () =>
                this.aiInsightRepo.save({
                    importId,
                    cacheKey,
                    model: generator.model,
                    promptVersion: PROMPT_VERSION,
                    output,
                })
            );
        }
        return result;
    }

    private async safely(what: string, work: () => Promise<void>): Promise<void> {
        try {
            await work();
        } catch (err) {
            logger.error(`Could not ${what}`, { error: err instanceof Error ? err.name : "Error" });
        }
    }

    private aiView(importId: number, analysis: BoardAnalysis, output: AiOutput, cached: boolean): InsightsView {
        const names = new Map([...recruiterKeysOf(analysis.queue)].map(([name, key]) => [key, name]));
        const withNames = (text: string) => text.replace(RECRUITER_KEY_PATTERN, (key) => names.get(key) ?? key);
        const draftByAction = new Map(output.drafts.map((draft) => [draft.action_code, draft.text]));

        return {
            importId,
            referenceDate: analysis.referenceDate,
            aiStatus: AiStatus.AI_DRAFT,
            errorCode: null,
            model: this.model,
            cached,
            topN: this.topN,
            briefing: { text: withNames(output.briefing), source: MessageSource.AI_DRAFT },
            bottleneckNotes: analysis.bottlenecks.map((bottleneck, index) => ({
                ...bottleneck,
                text: withNames(output.bottleneck_notes[index]),
                source: MessageSource.AI_DRAFT,
            })),
            drafts: analysis.queue.slice(0, this.topN).map((item) => ({
                rank: item.rank,
                candidateId: item.candidateId,
                name: item.name,
                actionCode: item.actionCode,
                recipient: item.recipient,
                text: fillPlaceholders(draftByAction.get(item.actionCode) as string, item),
                source: MessageSource.AI_DRAFT,
            })),
        };
    }

    private templateView(
        importId: number,
        analysis: BoardAnalysis,
        aiStatus: AiStatus,
        errorCode: AiErrorCode | null
    ): InsightsView {
        return {
            importId,
            referenceDate: analysis.referenceDate,
            aiStatus,
            errorCode,
            model: this.model,
            cached: false,
            topN: this.topN,
            briefing: { text: templateBriefing(analysis), source: MessageSource.TEMPLATE },
            bottleneckNotes: analysis.bottlenecks.map((bottleneck) => ({
                ...bottleneck,
                text: templateBottleneckNote(bottleneck),
                source: MessageSource.TEMPLATE,
            })),
            drafts: analysis.queue.slice(0, this.topN).map((item) => ({
                rank: item.rank,
                candidateId: item.candidateId,
                name: item.name,
                actionCode: item.actionCode,
                recipient: item.recipient,
                text: item.templateMessage,
                source: MessageSource.TEMPLATE,
            })),
        };
    }
}

export const newInsightService = async (
    importService: ImportServiceInterface,
    configService: ConfigServiceInterface,
    aiInsightRepo: AiInsightRepoInterface,
    llmCallRepo: LlmCallRepoInterface,
    generator: AiGenerator | null,
    topN: number
): Promise<InsightService> => {
    return new InsightService(importService, configService, aiInsightRepo, llmCallRepo, generator, topN);
};
