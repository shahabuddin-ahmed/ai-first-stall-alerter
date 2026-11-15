import { DataTypes, literal } from "sequelize";
import { Migration } from "../migrator";

// One row per call to the AI provider: cost, speed and result. Never the prompt or the answer text.
// Kept when an import is deleted (import_id becomes NULL), so usage history stays complete.
export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable(
        "llm_calls",
        {
            id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
            import_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
                references: { model: "imports", key: "id" },
                onDelete: "SET NULL",
                onUpdate: "CASCADE",
            },
            cache_key: { type: DataTypes.CHAR(64), allowNull: false },
            requested_model: { type: DataTypes.STRING(100), allowNull: false },
            served_model: { type: DataTypes.STRING(100), allowNull: true },
            input_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
            output_tokens: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
            cost_usd: { type: DataTypes.DECIMAL(12, 6), allowNull: true },
            latency_ms: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
            status: { type: DataTypes.ENUM("success", "failed"), allowNull: false },
            error_code: { type: DataTypes.STRING(40), allowNull: true, comment: "e.g. TIMEOUT, RATE_LIMITED, INVALID_OUTPUT" },
            created_at: { type: DataTypes.DATE(3), allowNull: false, defaultValue: literal("CURRENT_TIMESTAMP(3)") },
        },
        { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" }
    );
    // "Did the last call for this report fail?" (used by the export's ai_note_status)
    await queryInterface.addIndex("llm_calls", ["cache_key", "created_at"], { name: "idx_llm_calls_cache_key_created_at" });
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("llm_calls");
};
