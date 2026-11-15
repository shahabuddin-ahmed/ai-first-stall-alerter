import { literal, Transaction } from "sequelize";
import { SETTINGS_ID } from "../constant/setting";
import Setting, { SettingInterface } from "../model/setting";

export interface SettingRepoInterface {
    get(transaction?: Transaction): Promise<SettingInterface | null>;
    setUseAiDrafts(useAiDrafts: boolean): Promise<void>;
    bumpStagesVersion(expectedVersion: number, transaction: Transaction): Promise<boolean>;
}

export class SettingRepo implements SettingRepoInterface {
    public async get(transaction?: Transaction): Promise<SettingInterface | null> {
        const setting = await Setting.findByPk(SETTINGS_ID, { transaction });
        return setting ? (setting.get({ plain: true }) as SettingInterface) : null;
    }

    public async setUseAiDrafts(useAiDrafts: boolean): Promise<void> {
        await Setting.update({ useAiDrafts }, { where: { id: SETTINGS_ID } });
    }

    public async bumpStagesVersion(expectedVersion: number, transaction: Transaction): Promise<boolean> {
        const [affectedRows] = await Setting.update(
            { stagesVersion: literal("stages_version + 1") as unknown as number },
            { where: { id: SETTINGS_ID, stagesVersion: expectedVersion }, transaction }
        );
        return affectedRows === 1;
    }
}

export const newSettingRepo = async (): Promise<SettingRepoInterface> => {
    return new SettingRepo();
};

export default SettingRepo;
