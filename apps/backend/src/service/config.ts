import { ERROR_CODES } from "../constant/error";
import { StageType } from "../constant/stage";
import { StageRepoInterface } from "../repo/stage";
import { SettingRepoInterface } from "../repo/setting";
import { withTransaction } from "../repo/transaction";
import { findStageListProblems } from "../rules/stage-list-checks";
import { StageConfig, StageInput } from "../rules/types";
import { BadRequestException } from "../web/exception/bad-request-exception";
import { ConflictException } from "../web/exception/conflict-exception";

export interface ConfigSnapshot {
    stages: StageConfig[];
    stagesVersion: number;
    useAiDrafts: boolean;
}

export interface AiSetup {
    configured: boolean;
    model: string | null;
}

export interface SettingsView {
    useAiDrafts: boolean;
    aiConfigured: boolean;
    aiModel: string | null;
    stagesVersion: number;
}

export interface ConfigServiceInterface {
    load(): Promise<void>;
    getSnapshot(): ConfigSnapshot;
    saveStages(stages: StageInput[], expectedVersion: number): Promise<ConfigSnapshot>;
    getSettings(): SettingsView;
    updateSettings(update: { useAiDrafts: boolean }): Promise<SettingsView>;
}

export class ConfigService implements ConfigServiceInterface {
    private snapshot!: ConfigSnapshot;
    private saving: Promise<void> = Promise.resolve();

    constructor(
        private stageRepo: StageRepoInterface,
        private settingRepo: SettingRepoInterface,
        private aiSetup: AiSetup
    ) {}

    async load(): Promise<void> {
        const [stages, settings] = await Promise.all([this.stageRepo.list(), this.settingRepo.get()]);
        if (!settings || stages.length === 0) {
            throw new Error("No hiring stages or settings in the database. Run `yarn db:seed` first.");
        }
        this.snapshot = { stages, stagesVersion: settings.stagesVersion, useAiDrafts: settings.useAiDrafts };
    }

    getSnapshot(): ConfigSnapshot {
        return this.snapshot;
    }

    async saveStages(input: StageInput[], expectedVersion: number): Promise<ConfigSnapshot> {
        const stages: StageConfig[] = input.map((stage, index) => {
            const watched = stage.type === StageType.WATCHED;
            return {
                name: stage.name,
                type: stage.type,
                thresholdDays: watched ? stage.thresholdDays : null,
                position: index + 1,
                aliases: stage.aliases,
                actionCode: watched ? stage.actionCode : null,
            };
        });

        const problems = findStageListProblems(stages);
        if (problems.length > 0) {
            throw new BadRequestException(ERROR_CODES.E_INVALID_DATA, "The hiring stages cannot be saved", problems);
        }

        return this.oneAtATime(async () => {
            await withTransaction(async (transaction) => {
                const stillCurrent = await this.settingRepo.bumpStagesVersion(expectedVersion, transaction);
                if (!stillCurrent) {
                    throw new ConflictException(ERROR_CODES.E_CONFLICT, "", [
                        "The hiring stages were changed by someone else. Reload the page and try again.",
                    ]);
                }
                await this.stageRepo.replaceAll(stages, transaction);
            });
            await this.load();
            return this.getSnapshot();
        });
    }

    getSettings(): SettingsView {
        const { useAiDrafts, stagesVersion } = this.getSnapshot();
        return {
            useAiDrafts,
            aiConfigured: this.aiSetup.configured,
            aiModel: this.aiSetup.model,
            stagesVersion,
        };
    }

    async updateSettings(update: { useAiDrafts: boolean }): Promise<SettingsView> {
        return this.oneAtATime(async () => {
            await this.settingRepo.setUseAiDrafts(update.useAiDrafts);
            await this.load();
            return this.getSettings();
        });
    }

    private async oneAtATime<T>(work: () => Promise<T>): Promise<T> {
        const previousSave = this.saving;
        let finishSave = (): void => undefined;
        this.saving = new Promise<void>((resolve) => {
            finishSave = resolve;
        });

        try {
            await previousSave;
            return await work();
        } finally {
            finishSave();
        }
    }
}

export const newConfigService = async (
    stageRepo: StageRepoInterface,
    settingRepo: SettingRepoInterface,
    aiSetup: AiSetup
): Promise<ConfigService> => {
    const service = new ConfigService(stageRepo, settingRepo, aiSetup);
    await service.load();
    return service;
};
