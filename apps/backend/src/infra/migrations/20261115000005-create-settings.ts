import { DataTypes, literal } from "sequelize";
import { Migration } from "../migrator";

// Team settings: always one row (id = 1). Secrets (AI key, model) never go here; they stay in .env.
// stages_version goes up on every stages save, so cached AI results for old stages are not reused.
export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable(
        "settings",
        {
            id: { type: DataTypes.TINYINT.UNSIGNED, primaryKey: true },
            use_ai_drafts: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            stages_version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
            updated_at: {
                type: DataTypes.DATE(3),
                allowNull: false,
                defaultValue: literal("CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)"),
            },
        },
        { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" }
    );
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("settings");
};
