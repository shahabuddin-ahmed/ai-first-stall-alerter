import { Migration } from "../migrator";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("posts");
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query(
        `CREATE TABLE posts (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            title VARCHAR(150) NOT NULL,
            content TEXT NOT NULL,
            author VARCHAR(100) NOT NULL DEFAULT 'anonymous',
            tags JSON NOT NULL,
            published TINYINT(1) NOT NULL DEFAULT 0,
            createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (id)
        )`
    );
};
