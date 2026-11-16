import { Migration } from "../migrator";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query(
        `CREATE TABLE import_records (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            import_id INT UNSIGNED NOT NULL,
            record_number INT UNSIGNED NOT NULL COMMENT 'header = 1',
            field_count SMALLINT UNSIGNED NOT NULL,
            candidate_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
            name VARCHAR(50) NULL,
            role VARCHAR(50) NULL,
            stage VARCHAR(30) NULL,
            stage_entered_at DATE NULL,
            recruiter VARCHAR(50) NULL,
            last_activity_at DATE NULL,
            last_contacted_at DATE NULL,
            invalid_dates JSON NULL,
            created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (id),
            UNIQUE KEY uq_import_records_import_record (import_id, record_number),
            CONSTRAINT fk_import_records_import_id FOREIGN KEY (import_id) REFERENCES imports (id)
                ON DELETE CASCADE ON UPDATE CASCADE
        )`
    );
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable("import_records");
};
