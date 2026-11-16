import { DEFAULT_AI_MODEL } from "../../../../constant/ai";
import { BottleneckType } from "../../../../constant/pipeline";
import { AiModelInterface } from "../../../../model/ai-model";
import { AiProviderInterface, CompletionResult } from "../../../../service/ai-provider";
import { actionsOf, InsightFacts } from "../../../../service/pipeline-messages";

export const MOCK_MODELS: AiModelInterface[] = [
    { modelId: DEFAULT_AI_MODEL, name: "Ling 3.2 Flash (free)", contextLength: null },
    { modelId: "mock/other-model:free", name: "Other model (free)", contextLength: null },
];

export const MOCK_DRAFT = "Hi {{first_name}}, I am following up about the {{role}} role. Best, {{recruiter}}";

export const mockCompletion = (facts: InsightFacts, model = DEFAULT_AI_MODEL): CompletionResult => ({
    output: {
        briefing: `Start with rank 1. ${facts.board.stalled} candidates are past their stage threshold.`,
        bottleneck_notes: facts.bottlenecks.map((bottleneck) =>
            bottleneck.type === BottleneckType.STAGE
                ? `${bottleneck.stalled} follow-ups share the same next action. Clear them together.`
                : `${bottleneck.recruiter_key} owns ${bottleneck.stalled} stalled follow-ups. Share some of the load.`
        ),
        drafts: actionsOf(facts).map((action_code) => ({ action_code, text: MOCK_DRAFT })),
    },
    servedModel: model,
    inputTokens: null,
    outputTokens: null,
    costUsd: null,
});

export class MockAiProvider implements AiProviderInterface {
    async createCompletion(facts: InsightFacts, model: string): Promise<CompletionResult> {
        return mockCompletion(facts, model);
    }

    async fetchModels(): Promise<AiModelInterface[]> {
        return MOCK_MODELS;
    }
}
