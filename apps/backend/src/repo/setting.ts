import { literal, Transaction } from "sequelize";
import { SettingStatus, SETTINGS_ID } from "../constant/setting";
import Setting, { SettingInterface } from "../model/setting";

export interface SettingsUpdate {
    status: SettingStatus;
    aiModel: string;
}

export interface SettingRepoInterface {
    get(): Promise<SettingInterface | null>;
    update(update: SettingsUpdate): Promise<[number]>;
    bumpStagesVersion(expectedVersion: number, transaction: Transaction): Promise<[number]>;
}

export class SettingRepo implements SettingRepoInterface {
    public async get(): Promise<SettingInterface | null> {
        return Setting.findByPk(SETTINGS_ID);
    }

    public async update(update: SettingsUpdate): Promise<[number]> {
        return Setting.update(update, { where: { id: SETTINGS_ID } });
    }

    public async bumpStagesVersion(expectedVersion: number, transaction: Transaction): Promise<[number]> {
        return Setting.update(
            { stagesVersion: literal("stages_version + 1") },
            { where: { id: SETTINGS_ID, stagesVersion: expectedVersion }, transaction }
        );
    }
}

export const newSettingRepo = async (): Promise<SettingRepoInterface> => {
    return new SettingRepo();
};

export default SettingRepo;
