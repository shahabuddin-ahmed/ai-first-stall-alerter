import { Op } from "sequelize";
import { Migration } from "../migrator";

// The default hiring stages (spec C2) and the team settings row.
// Frozen copy on purpose: changing the defaults later means a new seed file, not editing this one.
const DEFAULT_STAGES = [
    { name: "Applied", type: "watched", threshold_days: 5, aliases: ["New", "Sourced"], action_code: "REVIEW_APPLICATION" },
    { name: "Screening", type: "watched", threshold_days: 7, aliases: ["Phone screen", "HR screen"], action_code: "SCHEDULE_SCREEN" },
    { name: "Interview", type: "watched", threshold_days: 14, aliases: ["Onsite", "Panel interview"], action_code: "REQUEST_FEEDBACK" },
    { name: "Assessment", type: "watched", threshold_days: 7, aliases: ["Take-home"], action_code: "REVIEW_ASSESSMENT" },
    { name: "Reference check", type: "watched", threshold_days: 5, aliases: ["References"], action_code: "CHASE_REFERENCES" },
    { name: "Offer", type: "watched", threshold_days: 3, aliases: [], action_code: "CONFIRM_OFFER" },
    { name: "On hold", type: "paused", threshold_days: null, aliases: ["Paused"], action_code: null },
    { name: "Hired", type: "final", threshold_days: null, aliases: [], action_code: null },
    { name: "Rejected", type: "final", threshold_days: null, aliases: [], action_code: null },
    { name: "Withdrawn", type: "final", threshold_days: null, aliases: ["Declined"], action_code: null },
];

const SETTINGS_ID = 1;

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
        await queryInterface.bulkInsert(
            "stages",
            DEFAULT_STAGES.map((stage, index) => ({
                ...stage,
                position: index + 1,
                aliases: JSON.stringify(stage.aliases),
            })),
            { transaction }
        );
        await queryInterface.bulkInsert(
            "settings",
            [{ id: SETTINGS_ID, use_ai_drafts: true, stages_version: 1 }],
            { transaction }
        );
    });
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
        await queryInterface.bulkDelete("settings", { id: SETTINGS_ID }, { transaction });
        await queryInterface.bulkDelete(
            "stages",
            { name: { [Op.in]: DEFAULT_STAGES.map((stage) => stage.name) } },
            { transaction }
        );
    });
};
