import LlmCall, { LlmCallInterface } from "../model/llm-call";

export interface LlmCallRepoInterface {
    log(call: LlmCallInterface): Promise<LlmCallInterface>;
    findLatest(cacheKey: string): Promise<LlmCallInterface | null>;
}

export class LlmCallRepo implements LlmCallRepoInterface {
    public async log(call: LlmCallInterface): Promise<LlmCallInterface> {
        return LlmCall.create(call);
    }

    public async findLatest(cacheKey: string): Promise<LlmCallInterface | null> {
        return LlmCall.findOne({
            where: { cacheKey },
            order: [
                ["createdAt", "DESC"],
                ["id", "DESC"],
            ],
        });
    }
}

export const newLlmCallRepo = async (): Promise<LlmCallRepoInterface> => {
    return new LlmCallRepo();
};

export default LlmCallRepo;
