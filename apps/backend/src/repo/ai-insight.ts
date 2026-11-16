import AiInsight, { AiInsightInterface } from "../model/ai-insight";

export interface AiInsightRepoInterface {
    findByKey(cacheKey: string): Promise<AiInsightInterface | null>;
    save(insight: AiInsightInterface): Promise<AiInsightInterface>;
}

export class AiInsightRepo implements AiInsightRepoInterface {
    public async findByKey(cacheKey: string): Promise<AiInsightInterface | null> {
        return AiInsight.findOne({ where: { cacheKey } });
    }

    public async save(insight: AiInsightInterface): Promise<AiInsightInterface> {
        return AiInsight.create(insight);
    }
}

export const newAiInsightRepo = async (): Promise<AiInsightRepoInterface> => {
    return new AiInsightRepo();
};

export default AiInsightRepo;
