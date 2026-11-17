import { Migration } from "../migrator";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query(
        `CREATE TABLE imports (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            public_id CHAR(36) NOT NULL COMMENT 'Random ID used by the API; the number id never leaves the server',
            file_name VARCHAR(255) NOT NULL,
            file_hash VARCHAR(130) NOT NULL COMMENT 'hash of the raw file bytes',
            file_size INT UNSIGNED NOT NULL COMMENT 'bytes',
            header_count SMALLINT UNSIGNED NOT NULL COMMENT 'fields in the header row',
            record_count INT UNSIGNED NOT NULL,
            created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (id),
            UNIQUE KEY uq_imports_file_hash (file_hash),
            KEY idx_imports_created_at (created_at),
            UNIQUE KEY uq_imports_public_id (public_id)
        )`
    );
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("imports");
};
