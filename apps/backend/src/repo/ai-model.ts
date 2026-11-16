import AiModel, { AiModelInterface } from "../model/ai-model";
import { withTransaction } from "./transaction";

export interface AiModelRepoInterface {
    list(): Promise<AiModelInterface[]>;
    replaceAll(models: AiModelInterface[]): Promise<void>;
}

export class AiModelRepo implements AiModelRepoInterface {
    public async list(): Promise<AiModelInterface[]> {
        return AiModel.findAll({ attributes: ["modelId", "name", "contextLength"], order: [["name", "ASC"]] });
    }

    public async replaceAll(models: AiModelInterface[]): Promise<void> {
        await withTransaction(async (transaction) => {
            await AiModel.destroy({ where: {}, transaction });
            await AiModel.bulkCreate(models, { transaction });
        });
    }
}

export const newAiModelRepo = async (): Promise<AiModelRepoInterface> => {
    return new AiModelRepo();
};

export default AiModelRepo;
