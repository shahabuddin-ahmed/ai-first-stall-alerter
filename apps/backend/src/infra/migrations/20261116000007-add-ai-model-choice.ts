import { Migration } from "../migrator";

export const up: Migration = async ({ context: queryInterface }) => {
    const run = (sql: string) => queryInterface.sequelize.query(sql);

    await run(
        "ALTER TABLE settings ADD COLUMN ai_model VARCHAR(100) NOT NULL DEFAULT 'inclusionai/ling-3.2-flash:free' AFTER use_ai_drafts"
    );
    await run(
        `CREATE TABLE ai_models (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            model_id VARCHAR(100) NOT NULL,
            name VARCHAR(100) NOT NULL,
            context_length INT UNSIGNED NULL,
            created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (id),
            UNIQUE KEY uq_ai_models_model_id (model_id)
        ) COMMENT 'free OpenRouter models, refreshed every 30 minutes'`
    );
};

export const down: Migration = async ({ context: queryInterface }) => {
    const run = (sql: string) => queryInterface.sequelize.query(sql);

    await run("DROP TABLE ai_models");
    await run("ALTER TABLE settings DROP COLUMN ai_model");
};
