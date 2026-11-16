import { Migration } from "../migrator";

const CREATED_AT = "created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)";
const UPDATED_AT = "updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)";

export const up: Migration = async ({ context: queryInterface }) => {
    const run = (sql: string) => queryInterface.sequelize.query(sql);

    await run(`ALTER TABLE imports ADD COLUMN ${UPDATED_AT} AFTER created_at`);
    await run(`ALTER TABLE import_records ADD COLUMN ${CREATED_AT}, ADD COLUMN ${UPDATED_AT}`);
    await run(`ALTER TABLE ai_insights ADD COLUMN ${UPDATED_AT} AFTER created_at`);
    await run(
        `ALTER TABLE llm_calls MODIFY id INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD COLUMN ${UPDATED_AT} AFTER created_at`
    );
    await run(
        `ALTER TABLE settings MODIFY id INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD COLUMN ${CREATED_AT} AFTER stages_version`
    );
};

export const down: Migration = async ({ context: queryInterface }) => {
    const run = (sql: string) => queryInterface.sequelize.query(sql);

    await run("ALTER TABLE settings MODIFY id TINYINT UNSIGNED NOT NULL, DROP COLUMN created_at");
    await run("ALTER TABLE llm_calls MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, DROP COLUMN updated_at");
    await run("ALTER TABLE ai_insights DROP COLUMN updated_at");
    await run("ALTER TABLE import_records DROP COLUMN created_at, DROP COLUMN updated_at");
    await run("ALTER TABLE imports DROP COLUMN updated_at");
};
