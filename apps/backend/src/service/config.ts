import { ERROR_CODES } from "../constant/error";
import { ActionCode, StageType } from "../constant/stage";
import { StageRepoInterface } from "../repo/stage";
import { SettingRepoInterface } from "../repo/setting";
import { withTransaction } from "../repo/transaction";
import { findStageListProblems } from "../rules/stage-list-checks";
import { StageConfig } from "../rules/types";
import { BadRequestException } from "../web/exception/bad-request-exception";
import { ConflictException } from "../web/exception/conflict-exception";

// Stages and team settings as the rest of the API sees them. Read from memory, never from the database.
export interface ConfigSnapshot {
    stages: StageConfig[];
    stagesVersion: number;
    useAiDrafts: boolean;
}

// What the browser may see about AI: whether it is set up and which model. Never the key.
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

// A stage as sent by the browser: the list order is the pipeline order, so there is no position.
export interface StageInput {
    name: string;
    type: StageType;
    thresholdDays: number | null;
    aliases: string[];
    actionCode: ActionCode | null;
}

export interface ConfigServiceInterface {
    load(): Promise<void>;
    getSnapshot(): ConfigSnapshot;
    saveStages(stages: StageInput[], expectedVersion: number): Promise<ConfigSnapshot>;
    getSettings(): SettingsView;
    updateSettings(update: { useAiDrafts: boolean }): Promise<SettingsView>;
}

// Write-through memory cache: every save goes to MySQL first, then the memory copy is reloaded from MySQL.
// Fine for one API process. Several processes would need a shared cache (see README).
export class ConfigService implements ConfigServiceInterface {
    private snapshot: ConfigSnapshot | null = null;
    // Saves run one after another, so the memory copy always ends with the last saved version.
    private saving: Promise<unknown> = Promise.resolve();

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
        if (!this.snapshot) {
            throw new Error("ConfigService.load() must run before the API handles requests");
        }
        return this.snapshot;
    }

    async saveStages(input: StageInput[], expectedVersion: number): Promise<ConfigSnapshot> {
        const stages: StageConfig[] = input.map((stage, index) => ({
            name: stage.name.trim(),
            type: stage.type,
            thresholdDays: stage.type === StageType.WATCHED ? stage.thresholdDays : null,
            position: index + 1,
            aliases: [...new Set(stage.aliases.map((alias) => alias.trim()).filter(Boolean))],
            actionCode: stage.type === StageType.WATCHED ? stage.actionCode : null,
        }));

        const problems = findStageListProblems(stages);
        if (problems.length > 0) {
            throw new BadRequestException(ERROR_CODES.E_INVALID_DATA, "The hiring stages cannot be saved", problems);
        }

        return this.oneAtATime(async () => {
            await withTransaction(async (transaction) => {
                // Optimistic lock: if someone saved since this user loaded the page, nothing is changed.
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

    private oneAtATime<T>(work: () => Promise<T>): Promise<T> {
        const run = this.saving.then(work, work);
        this.saving = run.catch(() => undefined);
        return run;
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
