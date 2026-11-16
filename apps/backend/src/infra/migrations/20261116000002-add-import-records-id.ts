import { Migration } from "../migrator";

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query(
        `ALTER TABLE import_records
            DROP PRIMARY KEY,
            ADD COLUMN id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST,
            ADD UNIQUE KEY uq_import_records_import_record (import_id, record_number)`
    );
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query(
        `ALTER TABLE import_records
            DROP COLUMN id,
            DROP INDEX uq_import_records_import_record,
            ADD PRIMARY KEY (import_id, record_number)`
    );
};
