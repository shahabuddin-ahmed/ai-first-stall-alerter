import { Transaction } from "sequelize";
import Stage, { StageInterface } from "../model/stage";
import { StageConfig } from "../rules/types";

export interface StageRepoInterface {
    list(transaction?: Transaction): Promise<StageConfig[]>;
    replaceAll(stages: StageConfig[], transaction: Transaction): Promise<void>;
}

const toStageConfig = (stage: StageInterface): StageConfig => ({
    name: stage.name,
    type: stage.type,
    thresholdDays: stage.thresholdDays,
    position: stage.position,
    aliases: stage.aliases,
    actionCode: stage.actionCode,
});

export class StageRepo implements StageRepoInterface {
    public async list(transaction?: Transaction): Promise<StageConfig[]> {
        const stages = await Stage.findAll({
            order: [["position", "ASC"]],
            transaction,
        });
        return stages.map((stage) => toStageConfig(stage.get({ plain: true }) as StageInterface));
    }

    public async replaceAll(stages: StageConfig[], transaction: Transaction): Promise<void> {
        await Stage.destroy({ where: {}, transaction });
        await Stage.bulkCreate(
            stages.map((stage) => ({
                name: stage.name,
                type: stage.type,
                thresholdDays: stage.thresholdDays,
                position: stage.position,
                aliases: stage.aliases,
                actionCode: stage.actionCode,
            })),
            { transaction }
        );
    }
}

export const newStageRepo = async (): Promise<StageRepoInterface> => {
    return new StageRepo();
};

export default StageRepo;
