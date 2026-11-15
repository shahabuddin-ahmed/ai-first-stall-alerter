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
        if (!found) {
            return null;
        }
        const output = found.get("output") as AiOutput | string;
        return typeof output === "string" ? (JSON.parse(output) as AiOutput) : output;
    }

    // Only checked answers are saved. If the same answer is saved twice at once, the first one stays.
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
