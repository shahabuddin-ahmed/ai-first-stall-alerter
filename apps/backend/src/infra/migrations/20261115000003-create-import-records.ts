import { DataTypes } from "sequelize";
import { Migration } from "../migrator";

// The rows of an import: only the 8 known CSV columns, stored as the raw text from the file.
// Validation and ranking run in code on every request, so nothing calculated is stored here.
export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable(
        "import_records",
        {
            import_id: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: false,
                primaryKey: true,
                references: { model: "imports", key: "id" },
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
            record_number: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, primaryKey: true, comment: "header = 1" },
            field_count: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
            // BINARY = utf8mb4_bin: IDs are case-sensitive and keep leading zeros ("0142" is not "142")
            candidate_id: { type: DataTypes.STRING(255).BINARY, allowNull: true },
            name: { type: DataTypes.STRING(255), allowNull: true },
            role: { type: DataTypes.STRING(255), allowNull: true },
            stage: { type: DataTypes.STRING(255), allowNull: true },
            stage_entered_at: { type: DataTypes.STRING(255), allowNull: true },
            recruiter: { type: DataTypes.STRING(255), allowNull: true },
            last_activity_at: { type: DataTypes.STRING(255), allowNull: true },
            last_contacted_at: { type: DataTypes.STRING(255), allowNull: true },
        },
        { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" }
    );
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("import_records");
};
