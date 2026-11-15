import { UniqueConstraintError } from "sequelize";
import { AiOutput } from "../ai/guardrails";
import AiInsight, { AiInsightInterface } from "../model/ai-insight";

export interface AiInsightRepoInterface {
    findByKey(cacheKey: string): Promise<AiOutput | null>;
    save(insight: AiInsightInterface): Promise<void>;
}

export class AiInsightRepo implements AiInsightRepoInterface {
    public async findByKey(cacheKey: string): Promise<AiOutput | null> {
        const found = await AiInsight.findOne({ where: { cacheKey } });
        return found ? (found.get("output") as AiOutput) : null;
    }

    public async save(insight: AiInsightInterface): Promise<void> {
        try {
            await AiInsight.create(insight);
        } catch (err) {
            if (!(err instanceof UniqueConstraintError)) {
                throw err;
            }
        }
    }
}

export const newAiInsightRepo = async (): Promise<AiInsightRepoInterface> => {
    return new AiInsightRepo();
};

export default AiInsightRepo;
