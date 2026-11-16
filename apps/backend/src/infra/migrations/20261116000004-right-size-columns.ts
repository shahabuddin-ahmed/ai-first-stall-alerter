import { QueryTypes } from "sequelize";
import { Migration } from "../migrator";

const DATE_COLUMNS = ["stage_entered_at", "last_activity_at", "last_contacted_at"];
const INVALID_DATE_TEXT = "invalid date";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isRealDate = (value: string): boolean => {
    if (!ISO_DATE.test(value)) {
        return false;
    }
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    return year >= 1 && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export const up: Migration = async ({ context: queryInterface }) => {
    const run = (sql: string, replacements?: unknown[]) => queryInterface.sequelize.query(sql, { replacements });

    await run(
        `ALTER TABLE import_records
            MODIFY candidate_id VARCHAR(36) BINARY NULL,
            MODIFY name VARCHAR(50) NULL,
            MODIFY role VARCHAR(50) NULL,
            MODIFY stage VARCHAR(30) NULL,
            MODIFY recruiter VARCHAR(50) NULL,
            ADD COLUMN invalid_dates JSON NULL AFTER last_contacted_at`
    );
    await run("ALTER TABLE stages MODIFY name VARCHAR(30) NOT NULL");
    await run(
        "ALTER TABLE llm_calls MODIFY error_code VARCHAR(20) NULL COMMENT 'e.g. TIMEOUT, RATE_LIMITED, INVALID_OUTPUT'"
    );
    await run(
        `ALTER TABLE ai_insights
            MODIFY prompt_version VARCHAR(10) NOT NULL,
            MODIFY output JSON NOT NULL COMMENT 'briefing, bottleneck notes, drafts by action'`
    );

    const rows = await queryInterface.sequelize.query<Record<string, string | number | null>>(
        `SELECT id, ${DATE_COLUMNS.join(", ")} FROM import_records`,
        { type: QueryTypes.SELECT }
    );
    for (const row of rows) {
        const invalid = DATE_COLUMNS.filter((column) => row[column] && !isRealDate(String(row[column])));
        if (invalid.length > 0) {
            await run("UPDATE import_records SET invalid_dates = ? WHERE id = ?", [JSON.stringify(invalid), row.id]);
        }
        for (const column of invalid) {
            await run(`UPDATE import_records SET ${column} = NULL WHERE id = ?`, [row.id]);
        }
    }

    for (const column of DATE_COLUMNS) {
        await run(`UPDATE import_records SET ${column} = NULL WHERE ${column} = ''`);
        await run(`ALTER TABLE import_records MODIFY ${column} DATE NULL`);
    }
};

export const down: Migration = async ({ context: queryInterface }) => {
    const run = (sql: string) => queryInterface.sequelize.query(sql);

    await run(
        `ALTER TABLE ai_insights
            MODIFY prompt_version VARCHAR(20) NOT NULL,
            MODIFY output JSON NOT NULL COMMENT 'briefing, bottleneck notes, drafts by rank'`
    );
    await run(
        "ALTER TABLE llm_calls MODIFY error_code VARCHAR(40) NULL COMMENT 'e.g. TIMEOUT, RATE_LIMITED, INVALID_OUTPUT'"
    );
    await run("ALTER TABLE stages MODIFY name VARCHAR(40) NOT NULL");

    for (const column of DATE_COLUMNS) {
        await run(`ALTER TABLE import_records MODIFY ${column} VARCHAR(255) NULL`);
        await run(
            `UPDATE import_records SET ${column} = '${INVALID_DATE_TEXT}'
             WHERE JSON_CONTAINS(invalid_dates, JSON_QUOTE('${column}'))`
        );
        await run(`UPDATE import_records SET ${column} = '' WHERE ${column} IS NULL`);
    }

    await run(
        `ALTER TABLE import_records
            DROP COLUMN invalid_dates,
            MODIFY candidate_id VARCHAR(255) BINARY NULL,
            MODIFY name VARCHAR(255) NULL,
            MODIFY role VARCHAR(255) NULL,
            MODIFY stage VARCHAR(255) NULL,
            MODIFY recruiter VARCHAR(255) NULL`
    );
};
