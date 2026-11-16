import { STAGE_LIMITS, StageType } from "../constant/stage";
import { normaliseStageName } from "./stage-matcher";
import { StageConfig } from "./types";

export const findStageListProblems = (stages: StageConfig[]): string[] => {
    const problems: string[] = [];

    if (!stages.some((stage) => stage.type === StageType.WATCHED)) {
        problems.push("Add at least one watched stage.");
    }

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
