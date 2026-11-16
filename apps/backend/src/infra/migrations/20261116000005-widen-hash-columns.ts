import { Migration } from "../migrator";

export const up: Migration = async ({ context: queryInterface }) => {
    const run = (sql: string) => queryInterface.sequelize.query(sql);

    await run("ALTER TABLE imports MODIFY file_hash VARCHAR(130) NOT NULL COMMENT 'hash of the raw file bytes'");
    await run("ALTER TABLE ai_insights MODIFY cache_key VARCHAR(130) NOT NULL");
    await run("ALTER TABLE llm_calls MODIFY cache_key VARCHAR(130) NOT NULL");
};

export const down: Migration = async ({ context: queryInterface }) => {
    const run = (sql: string) => queryInterface.sequelize.query(sql);

    await run("ALTER TABLE llm_calls MODIFY cache_key CHAR(64) NOT NULL");
    await run("ALTER TABLE ai_insights MODIFY cache_key CHAR(64) NOT NULL");
    await run("ALTER TABLE imports MODIFY file_hash CHAR(64) NOT NULL COMMENT 'SHA-256 of the raw file bytes'");
};
