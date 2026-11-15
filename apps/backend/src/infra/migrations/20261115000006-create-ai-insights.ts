import { DataTypes, literal } from "sequelize";
import { Migration } from "../migrator";

// Cache of validated AI answers. Stored before names are filled in (placeholders only, no candidate data).
// cache_key = hash of import + reference date + stages version + top N + prompt version + model.
export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable(
        "ai_insights",
        {
            id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
            import_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                references: { model: "imports", key: "id" },
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
            cache_key: { type: DataTypes.CHAR(64), allowNull: false },
            model: { type: DataTypes.STRING(100), allowNull: false },
            prompt_version: { type: DataTypes.STRING(20), allowNull: false },
            output: { type: DataTypes.JSON, allowNull: false, comment: "briefing, bottleneck notes, drafts by rank" },
            created_at: { type: DataTypes.DATE(3), allowNull: false, defaultValue: literal("CURRENT_TIMESTAMP(3)") },
        },
        { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" }
    );
    await queryInterface.addIndex("ai_insights", ["cache_key"], { unique: true, name: "uq_ai_insights_cache_key" });
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("ai_insights");
};
