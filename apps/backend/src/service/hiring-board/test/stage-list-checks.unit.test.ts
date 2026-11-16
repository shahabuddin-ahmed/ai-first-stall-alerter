import { StageType } from "../../../constant/stage";
import { findStageListProblems } from "../stage-list-checks";
import { StageConfig } from "../types";
import { DEFAULT_STAGES } from "./default-stages";

const withChange = (index: number, change: Partial<StageConfig>): StageConfig[] =>
    DEFAULT_STAGES.map((stage, i) => (i === index ? { ...stage, ...change } : stage));

describe("findStageListProblems", () => {
    it("accepts the default stages", () => {
        expect(findStageListProblems(DEFAULT_STAGES)).toEqual([]);
    });

    it("needs at least one watched stage", () => {
        const onlyFinal = DEFAULT_STAGES.filter((stage) => stage.type === StageType.FINAL);
        expect(findStageListProblems(onlyFinal)).toEqual(["Add at least one watched stage."]);
    });

    it("rejects two stages with the same name, ignoring capitals and spaces", () => {
        expect(findStageListProblems(withChange(1, { name: "applied" }))).toEqual([
            '"applied" is used more than once (as a stage name or alias).',
        ]);
    });

    it("rejects an alias that is already another stage's name or alias", () => {
        expect(findStageListProblems(withChange(5, { aliases: ["Onsite"] }))).toEqual([
            '"Onsite" is used more than once (as a stage name or alias).',
        ]);
    });

    it("needs a threshold and an action on watched stages", () => {
        expect(findStageListProblems(withChange(0, { thresholdDays: null, actionCode: null }))).toEqual([
            '"Applied" needs a threshold between 1 and 90 days.',
            '"Applied" needs a follow-up action.',
        ]);
    });
});
