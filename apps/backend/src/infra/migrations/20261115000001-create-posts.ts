import { DataTypes } from "sequelize";
import { Migration } from "../migrator";

// Sample table from the boilerplate (src/model/post.ts), kept as reference code.
export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable(
        "posts",
        {
            id: {
                type: DataTypes.INTEGER.UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
            },
            title: {
                type: DataTypes.STRING(150),
                allowNull: false,
            },
            content: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            author: {
                type: DataTypes.STRING(100),
                allowNull: false,
                defaultValue: "anonymous",
            },
            tags: {
                type: DataTypes.JSON,
                allowNull: false,
            },
            published: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        },
        { charset: "utf8mb4", collate: "utf8mb4_0900_ai_ci" },
    );
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("posts");
};
