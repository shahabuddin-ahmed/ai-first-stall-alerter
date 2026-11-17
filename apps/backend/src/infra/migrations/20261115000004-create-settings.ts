import { Migration } from "../migrator";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query(
        `CREATE TABLE settings (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            status TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'AI status: 1 = active (AI writes drafts), 0 = inactive (templates only)',
            ai_model VARCHAR(100) NOT NULL DEFAULT 'inclusionai/ling-3.2-flash:free',
            stages_version INT UNSIGNED NOT NULL DEFAULT 1,
            created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (id)
        )`
    );
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("settings");
};
