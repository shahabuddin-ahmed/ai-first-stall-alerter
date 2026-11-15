import { DataTypes, literal } from "sequelize";
import { Migration } from "../migrator";

// One row per uploaded CSV file. The same file (same bytes) can only be stored once:
// the UNIQUE file_hash makes a second upload fail inside MySQL, even when both arrive at the same moment.
export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable(
        "imports",
        {
            id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
            file_name: { type: DataTypes.STRING(255), allowNull: false },
            file_hash: { type: DataTypes.CHAR(64), allowNull: false, comment: "SHA-256 of the raw file bytes" },
            file_size: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, comment: "bytes" },
            header_count: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, comment: "fields in the header row" },
            record_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
            created_at: { type: DataTypes.DATE(3), allowNull: false, defaultValue: literal("CURRENT_TIMESTAMP(3)") },
        },
        { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" }
    );
    await queryInterface.addIndex("imports", ["file_hash"], { unique: true, name: "uq_imports_file_hash" });
    await queryInterface.addIndex("imports", ["created_at"], { name: "idx_imports_created_at" });
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("imports");
};
