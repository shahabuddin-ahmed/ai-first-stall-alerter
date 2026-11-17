import { DEFAULT_AI_MODEL } from "../../../../constant/ai";
import { BottleneckType } from "../../../../constant/pipeline";
import { ActionCode, RecipientType } from "../../../../constant/stage";
import { AiModel, AiProviderInterface, CompletionResult } from "../../../../service/ai-provider";
import { ACTIONS, actionsOf, InsightFacts } from "../../../../service/pipeline-messages";

export const MOCK_MODELS: AiModel[] = [
    { modelId: DEFAULT_AI_MODEL, name: "Ling 3.2 Flash (free)", contextLength: null, inputPrice: 0, outputPrice: 0 },
    { modelId: "mock/other-model:free", name: "Other model (free)", contextLength: null, inputPrice: 0, outputPrice: 0 },
];

export const MOCK_CANDIDATE_DRAFT = "Hi {{first_name}}, I am following up about the {{role}} role. Best, {{recruiter}}";
export const MOCK_TEAM_DRAFT = "Hello, could you follow up on {{name}} for the {{role}} role? Thanks, {{recruiter}}";

const mockDraft = (actionCode: ActionCode): string =>
    ACTIONS[actionCode].recipient === RecipientType.CANDIDATE ? MOCK_CANDIDATE_DRAFT : MOCK_TEAM_DRAFT;

export const mockCompletion = (facts: InsightFacts, model = DEFAULT_AI_MODEL): CompletionResult => ({
    output: {
        briefing: `Start with rank 1. ${facts.board.stalled} candidates are past their stage threshold.`,
        bottleneck_notes: facts.bottlenecks.map((bottleneck) =>
            bottleneck.type === BottleneckType.STAGE
                ? `${bottleneck.stalled} follow-ups share the same next action. Clear them together.`
                : `${bottleneck.recruiter_key} owns ${bottleneck.stalled} stalled follow-ups. Share some of the load.`
        ),
        drafts: actionsOf(facts).map((action_code) => ({ action_code, text: mockDraft(action_code) })),
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

    async fetchModels(): Promise<AiModel[]> {
        return MOCK_MODELS;
    }
}
