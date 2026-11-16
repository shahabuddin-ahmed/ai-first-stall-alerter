import { ModelSource } from "../ai/model-source";
import { AI_MODEL_LIST } from "../constant/ai";
import logger from "../infra/logger";
import { AiModelInterface } from "../model/ai-model";
import { AiModelRepoInterface } from "../repo/ai-model";

export interface AiModelServiceInterface {
    list(): Promise<AiModelInterface[]>;
    isAvailable(modelId: string): Promise<boolean>;
}

export class AiModelService implements AiModelServiceInterface {
    private refreshing: Promise<void> | null = null;

    constructor(
        private aiModelRepo: AiModelRepoInterface,
        private modelSource: ModelSource
    ) {}

    async list(): Promise<AiModelInterface[]> {
        await this.refreshIfOld();
        return this.aiModelRepo.list();
    }

    async isAvailable(modelId: string): Promise<boolean> {
        const models = await this.list();
        return models.some((model) => model.modelId === modelId);
    }

    private async refreshIfOld(): Promise<void> {
        const lastRefreshedAt = await this.aiModelRepo.lastRefreshedAt();
        if (lastRefreshedAt && Date.now() - new Date(lastRefreshedAt).getTime() < AI_MODEL_LIST.CACHE_MS) {
            return;
        }
        this.refreshing ??= this.refresh().finally(() => {
            this.refreshing = null;
        });
        await this.refreshing;
    }

    private async refresh(): Promise<void> {
        try {
            const models = await this.modelSource.listFreeModels();
            if (models.length > 0) {
                await this.aiModelRepo.replaceAll(models);
            }
        } catch (err) {
            logger.warn("Could not refresh the AI model list", {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
}

export const newAiModelService = async (
    aiModelRepo: AiModelRepoInterface,
    modelSource: ModelSource
): Promise<AiModelService> => {
    return new AiModelService(aiModelRepo, modelSource);
};
