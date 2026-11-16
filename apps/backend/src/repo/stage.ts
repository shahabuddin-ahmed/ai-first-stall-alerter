import { Transaction } from "sequelize";
import Stage, { StageInterface } from "../model/stage";
import { StageConfig } from "../service/pipeline-types";

export interface StageRepoInterface {
    list(): Promise<StageInterface[]>;
    replaceAll(stages: StageConfig[], transaction: Transaction): Promise<void>;
}

export class StageRepo implements StageRepoInterface {
    public async list(): Promise<StageInterface[]> {
        return Stage.findAll({ order: [["position", "ASC"]] });
    }

    public async replaceAll(stages: StageConfig[], transaction: Transaction): Promise<void> {
        await Stage.destroy({ where: {}, transaction });
        await Stage.bulkCreate(stages, { transaction });
    }
}

export const newStageRepo = async (): Promise<StageRepoInterface> => {
    return new StageRepo();
};

export default StageRepo;
