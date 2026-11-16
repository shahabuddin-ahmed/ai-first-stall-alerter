import { StageConfig } from "./types";

export const normaliseStageName = (value: string): string => value.replace(/\s+/g, " ").toLowerCase();

export const buildStageLookup = (stages: StageConfig[]): Map<string, StageConfig> => {
    const lookup = new Map<string, StageConfig>();
    for (const stage of stages) {
        for (const name of [stage.name, ...stage.aliases]) {
            lookup.set(normaliseStageName(name), stage);
        }
    }
    return lookup;
};
