import { Migration } from "../migrator";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query(
        `ALTER TABLE settings CHANGE use_ai_drafts status TINYINT UNSIGNED NOT NULL DEFAULT 1
            COMMENT 'AI status: 1 = active (AI writes drafts), 0 = inactive (templates only)'`
    );
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query(
        "ALTER TABLE settings CHANGE status use_ai_drafts TINYINT(1) NOT NULL DEFAULT 1"
    );
};
