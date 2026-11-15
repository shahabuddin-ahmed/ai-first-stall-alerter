import { StageType } from "../constant/stage";
import { normaliseStageName } from "./stage-matcher";
import { StageConfig } from "./types";

export const STAGE_LIMITS = {
    MIN_THRESHOLD_DAYS: 1,
    MAX_THRESHOLD_DAYS: 90,
} as const;

// Rules for a whole stage list before it is saved (spec C2).
// Returns the problems in plain words; an empty list means the stages can be saved.
export const findStageListProblems = (stages: StageConfig[]): string[] => {
    const problems: string[] = [];

    if (!stages.some((stage) => stage.type === StageType.WATCHED)) {
        problems.push("Add at least one watched stage.");
    }

    // Every name and alias must point to one stage only, or a CSV value could match two stages.
    const seen = new Set<string>();
    for (const stage of stages) {
        for (const name of [stage.name, ...stage.aliases]) {
            const key = normaliseStageName(name);
            if (seen.has(key)) {
                problems.push(`"${name.trim()}" is used more than once (as a stage name or alias).`);
            }
            seen.add(key);
        }
    }

    for (const stage of stages) {
        if (stage.type === StageType.WATCHED) {
            const threshold = stage.thresholdDays;
            if (
                threshold === null ||
                !Number.isInteger(threshold) ||
                threshold < STAGE_LIMITS.MIN_THRESHOLD_DAYS ||
                threshold > STAGE_LIMITS.MAX_THRESHOLD_DAYS
            ) {
                problems.push(
                    `"${stage.name}" needs a threshold between ${STAGE_LIMITS.MIN_THRESHOLD_DAYS} and ${STAGE_LIMITS.MAX_THRESHOLD_DAYS} days.`
                );
            }
            if (stage.actionCode === null) {
                problems.push(`"${stage.name}" needs a follow-up action.`);
            }
        } else if (stage.thresholdDays !== null || stage.actionCode !== null) {
            problems.push(`"${stage.name}" is a ${stage.type} stage, so it cannot have a threshold or an action.`);
        }
    }

    return problems;
};
