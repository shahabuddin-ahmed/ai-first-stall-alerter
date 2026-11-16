import { AI_MODEL_LIST, DEFAULT_AI_MODEL } from "../constant/ai";
import { AiModelInterface } from "../model/ai-model";

export interface ModelSource {
    listFreeModels(): Promise<AiModelInterface[]>;
}

interface OpenRouterModel {
    id: string;
    name: string;
    context_length?: number | null;
    supported_parameters?: string[];
}

const isUsable = (model: OpenRouterModel): boolean =>
    model.id.endsWith(AI_MODEL_LIST.FREE_SUFFIX) &&
    (model.supported_parameters ?? []).includes(AI_MODEL_LIST.REQUIRED_PARAMETER);

export class HttpModelSource implements ModelSource {
    constructor(private baseUrl: string) {}

    async listFreeModels(): Promise<AiModelInterface[]> {
        const response = await fetch(`${this.baseUrl}${AI_MODEL_LIST.PATH}`, {
            signal: AbortSignal.timeout(AI_MODEL_LIST.TIMEOUT_MS),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const body = (await response.json()) as { data?: OpenRouterModel[] };
        return (body.data ?? []).filter(isUsable).map((model) => ({
            modelId: model.id,
            name: model.name,
            contextLength: model.context_length ?? null,
        }));
    }
}

export const FAKE_MODELS: AiModelInterface[] = [
    { modelId: DEFAULT_AI_MODEL, name: "Ling 3.2 Flash (free)", contextLength: null },
    { modelId: "fake/other-model:free", name: "Other model (free)", contextLength: null },
];

export class FakeModelSource implements ModelSource {
    async listFreeModels(): Promise<AiModelInterface[]> {
        return FAKE_MODELS;
    }
}
