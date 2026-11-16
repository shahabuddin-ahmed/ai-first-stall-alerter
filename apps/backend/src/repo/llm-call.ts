import LlmCall, { LlmCallInterface } from "../model/llm-call";

export interface LlmCallRepoInterface {
    log(call: LlmCallInterface): Promise<void>;
    findLatest(cacheKey: string): Promise<LlmCallInterface | null>;
}

export class LlmCallRepo implements LlmCallRepoInterface {
    public async log(call: LlmCallInterface): Promise<void> {
        await LlmCall.create(call);
    }

    public async findLatest(cacheKey: string): Promise<LlmCallInterface | null> {
        const found = await LlmCall.findOne({
            where: { cacheKey },
            order: [
                ["createdAt", "DESC"],
                ["id", "DESC"],
            ],
        });
        return found ? (found.get({ plain: true }) as LlmCallInterface) : null;
    }
}

export const newLlmCallRepo = async (): Promise<LlmCallRepoInterface> => {
    return new LlmCallRepo();
};

export default LlmCallRepo;
