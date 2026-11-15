import { STAGE_LIMITS, StageType } from "../constant/stage";
import { normaliseStageName } from "./stage-matcher";
import { StageConfig } from "./types";

// Rules for a whole stage list before it is saved (spec C2). Single values (name, type, threshold range)
// are already checked by the request schema; these rules need the whole list.
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
                problems.push(`"${name}" is used more than once (as a stage name or alias).`);
            }
            seen.add(key);
        }
    }

    for (const stage of stages.filter((item) => item.type === StageType.WATCHED)) {
        if (stage.thresholdDays === null) {
            problems.push(
                `"${stage.name}" needs a threshold between ${STAGE_LIMITS.MIN_THRESHOLD_DAYS} and ${STAGE_LIMITS.MAX_THRESHOLD_DAYS} days.`
            );
        }
        if (stage.actionCode === null) {
            problems.push(`"${stage.name}" needs a follow-up action.`);
        }
    }

    return problems;
};
