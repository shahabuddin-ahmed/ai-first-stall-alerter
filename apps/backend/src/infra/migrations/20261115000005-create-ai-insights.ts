import { Migration } from "../migrator";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query(
        `CREATE TABLE ai_insights (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            import_id INT UNSIGNED NOT NULL,
            cache_key VARCHAR(130) NOT NULL,
            model VARCHAR(100) NOT NULL,
            prompt_version VARCHAR(10) NOT NULL,
            output JSON NOT NULL COMMENT 'briefing, bottleneck notes, drafts by action',
            created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (id),
            UNIQUE KEY uq_ai_insights_cache_key (cache_key),
            KEY idx_ai_insights_import_id (import_id),
            CONSTRAINT fk_ai_insights_import_id FOREIGN KEY (import_id) REFERENCES imports (id)
                ON DELETE CASCADE ON UPDATE CASCADE
        )`
    );
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("ai_insights");
};
