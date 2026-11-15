import { DataTypes, literal } from "sequelize";
import { Migration } from "../migrator";

// Hiring stages are configuration, not code. Position = pipeline order (later = more urgent).
// The values below are frozen on purpose: a new action code later means a new migration.
export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable(
        "stages",
        {
            id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
            name: { type: DataTypes.STRING(40), allowNull: false },
            type: { type: DataTypes.ENUM("watched", "paused", "final"), allowNull: false },
            threshold_days: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true, comment: "watched stages only, 1-90" },
            position: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
            aliases: { type: DataTypes.JSON, allowNull: false, comment: "other names used in CSV files" },
            created_at: { type: DataTypes.DATE(3), allowNull: false, defaultValue: literal("CURRENT_TIMESTAMP(3)") },
            updated_at: {
                type: DataTypes.DATE(3),
                allowNull: false,
                defaultValue: literal("CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)"),
            },
        },
        { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" }
    );
    // Added separately: Sequelize's createTable reads the word "REFERENCES" (in CHASE_REFERENCES)
    // as a foreign key and fails, so this column cannot be part of createTable.
    await queryInterface.addColumn("stages", "action_code", {
        type: DataTypes.ENUM(
            "REVIEW_APPLICATION",
            "SCHEDULE_SCREEN",
            "REQUEST_FEEDBACK",
            "REVIEW_ASSESSMENT",
            "CHASE_REFERENCES",
            "CONFIRM_OFFER",
            "GENERIC_FOLLOW_UP"
        ),
        allowNull: true,
        comment: "watched stages only",
    });
    await queryInterface.addIndex("stages", ["name"], { unique: true, name: "uq_stages_name" });
    await queryInterface.addIndex("stages", ["position"], { unique: true, name: "uq_stages_position" });
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("stages");
};
