import { StageConfig } from "./types";

// " PANEL   interview " and "Panel interview" are the same stage.
export const normaliseStageName = (value: string): string => value.split(/\s+/).filter(Boolean).join(" ").toLowerCase();

// Every stage name and alias, normalised, pointing to its stage.
export const buildStageLookup = (stages: StageConfig[]): Map<string, StageConfig> => {
    const lookup = new Map<string, StageConfig>();
    for (const stage of stages) {
        for (const name of [stage.name, ...stage.aliases]) {
            lookup.set(normaliseStageName(name), stage);
        }
    }
    return lookup;
};
