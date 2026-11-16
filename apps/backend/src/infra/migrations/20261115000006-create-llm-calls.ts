import { Migration } from "../migrator";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query(
        `CREATE TABLE llm_calls (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            import_id INT UNSIGNED NULL,
            cache_key VARCHAR(130) NOT NULL,
            requested_model VARCHAR(100) NOT NULL,
            served_model VARCHAR(100) NULL,
            input_tokens INT UNSIGNED NULL,
            output_tokens INT UNSIGNED NULL,
            cost_usd DECIMAL(12, 6) NULL,
            latency_ms INT UNSIGNED NOT NULL,
            status ENUM('success', 'failed') NOT NULL,
            error_code VARCHAR(20) NULL COMMENT 'e.g. TIMEOUT, RATE_LIMITED, INVALID_OUTPUT',
            created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (id),
            KEY idx_llm_calls_import_id (import_id),
            KEY idx_llm_calls_cache_key_created_at (cache_key, created_at),
            CONSTRAINT fk_llm_calls_import_id FOREIGN KEY (import_id) REFERENCES imports (id)
                ON DELETE SET NULL ON UPDATE CASCADE
        )`
    );
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("llm_calls");
};
