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
import { AiError, AiGenerator, GenerationResult } from "../ai/generator";
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

// What is already known about AI for a report, without calling the AI (used by the export).
export interface SavedDrafts {
    status: AiNoteStatus.AI_DRAFT | AiNoteStatus.DISABLED | AiNoteStatus.PENDING | AiNoteStatus.UNAVAILABLE;
    topN: number;
    draftsByRank: Map<number, string>; // AI drafts with names filled in (only when status is AI_DRAFT)
}

export interface InsightServiceInterface {
    getInsights(importId: number, referenceDate?: string): Promise<InsightsView>;
    getSavedDrafts(importId: number, analysis: BoardAnalysis): Promise<SavedDrafts>;
}

type Attempt = { ok: true; output: AiOutput } | { ok: false; code: AiErrorCode };

// Briefing, bottleneck notes and a message for each of the top N alerts (spec E).
// AI writes the text only when it is set up and turned on; every other case, and every failure, uses templates.
export class InsightService implements InsightServiceInterface {
    // Requests for the same report at the same moment share one AI call.
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

    // Reads the cache and the call log only. Never calls the AI.
    async getSavedDrafts(importId: number, analysis: BoardAnalysis): Promise<SavedDrafts> {
        const saved = (status: SavedDrafts["status"], draftsByRank = new Map<number, string>()): SavedDrafts => ({
            status,
            topN: this.topN,
            draftsByRank,
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
            const items = new Map(analysis.queue.map((item) => [item.rank, item]));
            const draftsByRank = new Map(
                cached.drafts
                    .filter((draft) => items.has(draft.rank))
                    .map((draft) => [draft.rank, fillPlaceholders(draft.text, items.get(draft.rank)!)])
            );
            return saved(AiNoteStatus.AI_DRAFT, draftsByRank);
        }

        const lastCall = await this.llmCallRepo.findLatest(cacheKey);
        return saved(lastCall?.status === LlmCallStatus.FAILED ? AiNoteStatus.UNAVAILABLE : AiNoteStatus.PENDING);
    }

    // One report = one import, reference date, stages version, top N, prompt version and model.
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
        const attempt = this.attempt(cacheKey, importId, facts).finally(() => this.inFlight.delete(cacheKey));
        this.inFlight.set(cacheKey, attempt);
        return attempt;
    }

    private async attempt(cacheKey: string, importId: number, facts: InsightFacts): Promise<Attempt> {
        const generator = this.generator as AiGenerator;
        const startedAt = Date.now();
        let result: Attempt;
        let usage: Omit<GenerationResult, "output"> = {
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
                // Rule names and ranks only, no candidate data.
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
            // Only checked answers are cached, with placeholders (no names). Failures are never cached.
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

    // Logging and caching must never break the answer the user gets.
    private async safely(what: string, work: () => Promise<void>): Promise<void> {
        try {
            await work();
        } catch (err) {
            logger.error(`Could not ${what}`, { error: err instanceof Error ? err.name : "Error" });
        }
    }

    private aiView(importId: number, analysis: BoardAnalysis, output: AiOutput, cached: boolean): InsightsView {
        // Turn "R1" back into the recruiter's name for people reading the text.
        const names = new Map([...recruiterKeysOf(analysis.queue)].map(([name, key]) => [key, name]));
        const withNames = (text: string) => text.replace(RECRUITER_KEY_PATTERN, (key) => names.get(key) ?? key);
        const draftByRank = new Map(output.drafts.map((draft) => [draft.rank, draft.text]));

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
                text: fillPlaceholders(draftByRank.get(item.rank) as string, item),
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
