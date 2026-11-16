import { ActionCode, StageType } from "../../../constant/stage";
import { StageConfig } from "../types";

// Test data only: the default hiring stages, the same as the seed file
// (src/infra/seeders). The running app always reads the stages from the database.
export const DEFAULT_STAGES: StageConfig[] = [
    {
        name: "Applied",
        type: StageType.WATCHED,
        thresholdDays: 5,
        aliases: ["New", "Sourced"],
        actionCode: ActionCode.REVIEW_APPLICATION,
    },
    {
        name: "Screening",
        type: StageType.WATCHED,
        thresholdDays: 7,
        aliases: ["Phone screen", "HR screen"],
        actionCode: ActionCode.SCHEDULE_SCREEN,
    },
    {
        name: "Interview",
        type: StageType.WATCHED,
        thresholdDays: 14,
        aliases: ["Onsite", "Panel interview"],
        actionCode: ActionCode.REQUEST_FEEDBACK,
    },
    {
        name: "Assessment",
        type: StageType.WATCHED,
        thresholdDays: 7,
        aliases: ["Take-home"],
        actionCode: ActionCode.REVIEW_ASSESSMENT,
    },
    {
        name: "Reference check",
        type: StageType.WATCHED,
        thresholdDays: 5,
        aliases: ["References"],
        actionCode: ActionCode.CHASE_REFERENCES,
    },
    { name: "Offer", type: StageType.WATCHED, thresholdDays: 3, aliases: [], actionCode: ActionCode.CONFIRM_OFFER },
    { name: "On hold", type: StageType.PAUSED, thresholdDays: null, aliases: ["Paused"], actionCode: null },
    { name: "Hired", type: StageType.FINAL, thresholdDays: null, aliases: [], actionCode: null },
    { name: "Rejected", type: StageType.FINAL, thresholdDays: null, aliases: [], actionCode: null },
    { name: "Withdrawn", type: StageType.FINAL, thresholdDays: null, aliases: ["Declined"], actionCode: null },
].map((stage, index) => ({ ...stage, position: index + 1 }));
