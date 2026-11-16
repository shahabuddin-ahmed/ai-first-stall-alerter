import { QueryTypes, UniqueConstraintError } from "sequelize";
import { DEFAULT_AI_MODEL } from "../../constant/ai";
import { assertTestDatabase } from "./test-database";
import newSequelize, { createDatabaseIfMissing } from "../sequelize";
import { newMigrator, newSeeder } from "../migrator";

// Needs MySQL with the test database (docker compose up db). Runs against MYSQL_TEST_DATABASE only.
const sequelize = newSequelize();
const migrator = newMigrator(sequelize);
const seeder = newSeeder(sequelize);

const APP_TABLES = ["ai_insights", "ai_models", "import_records", "imports", "llm_calls", "settings", "stages"];
const HISTORY_TABLES = ["SequelizeData", "SequelizeMeta"];
const ALL_TABLES = [...APP_TABLES, ...HISTORY_TABLES];

const listTables = async (): Promise<string[]> => {
    const rows = await sequelize.query<Record<string, string>>("SHOW TABLES", { type: QueryTypes.SELECT });
    return rows.map((row) => Object.values(row)[0]).sort();
};

const insertImport = async (fileHash: string): Promise<number> => {
    const [id] = await sequelize.query(
        "INSERT INTO imports (file_name, file_hash, file_size, header_count, record_count) VALUES (?, ?, 100, 8, 1)",
        { replacements: ["board.csv", fileHash], type: QueryTypes.INSERT }
    );
    return id as number;
};

const countRows = async (sql: string, replacements: unknown[]): Promise<number> => {
    const [row] = await sequelize.query<{ total: number }>(sql, { replacements, type: QueryTypes.SELECT });
    return Number(row.total);
};

beforeAll(async () => {
    // Safety: never drop tables in a real database.
    assertTestDatabase();
    await createDatabaseIfMissing();
    // Start from an empty database.
    await seeder.down({ to: 0 });
    await migrator.down({ to: 0 });
    await sequelize.query(`DROP TABLE IF EXISTS ${HISTORY_TABLES.join(", ")}`);
});

afterEach(async () => {
    if ((await listTables()).includes("imports")) {
        await sequelize.query("DELETE FROM llm_calls");
        await sequelize.query("DELETE FROM imports");
    }
});

afterAll(async () => {
    // Leave the test database ready for the other integration tests.
    await migrator.up();
    await seeder.up();
    await sequelize.close();
});

describe("database migrations", () => {
    it("creates every table on an empty database", async () => {
        expect(await seeder.executed()).toEqual([]);
        const pending = await migrator.pending();
        const done = await migrator.up();

        expect(pending.length).toBeGreaterThan(0);
        expect(done.map((migration) => migration.name)).toEqual(pending.map((migration) => migration.name));
        expect(await listTables()).toEqual(expect.arrayContaining(APP_TABLES));
        expect(await listTables()).not.toContain("posts");
    });

    it("gives every table an auto-increment id, created_at and updated_at", async () => {
        const columns = await sequelize.query<{
            table_name: string;
            column_name: string;
            column_type: string;
            extra: string;
        }>(
            `SELECT table_name AS table_name, column_name AS column_name, column_type AS column_type, extra AS extra
             FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name IN (?)
               AND column_name IN ('id', 'created_at', 'updated_at')`,
            { replacements: [ALL_TABLES], type: QueryTypes.SELECT }
        );
        const ids = columns.filter((column) => column.column_name === "id");
        const times = columns.filter((column) => column.column_name !== "id");

        expect(ids).toHaveLength(ALL_TABLES.length);
        ids.forEach((id) =>
            expect([id.table_name, id.column_type, id.extra]).toEqual([id.table_name, "int unsigned", "auto_increment"])
        );
        expect(times).toHaveLength(ALL_TABLES.length * 2);
        times.forEach((time) => expect([time.table_name, time.column_type]).toEqual([time.table_name, "timestamp(3)"]));
    });

    it("stores CSV dates as DATE and keeps the text columns to real-life sizes", async () => {
        const columns = await sequelize.query<{ column_name: string; column_type: string }>(
            `SELECT column_name AS column_name, column_type AS column_type FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'import_records'`,
            { type: QueryTypes.SELECT }
        );
        const typeOf = Object.fromEntries(columns.map((column) => [column.column_name, column.column_type]));

        expect(typeOf).toMatchObject({
            candidate_id: "varchar(36)",
            name: "varchar(50)",
            role: "varchar(50)",
            stage: "varchar(30)",
            recruiter: "varchar(50)",
            stage_entered_at: "date",
            last_activity_at: "date",
            last_contacted_at: "date",
            invalid_dates: "json",
        });
    });

    it("keeps the other text columns to real-life sizes", async () => {
        const columns = await sequelize.query<{ name: string; column_type: string }>(
            `SELECT CONCAT(table_name, '.', column_name) AS name, column_type AS column_type
             FROM information_schema.columns
             WHERE table_schema = DATABASE()
               AND CONCAT(table_name, '.', column_name) IN ('stages.name', 'llm_calls.error_code', 'ai_insights.prompt_version',
                 'imports.file_hash', 'ai_insights.cache_key', 'llm_calls.cache_key', 'settings.ai_model',
                 'ai_models.model_id', 'ai_models.name')`,
            { type: QueryTypes.SELECT }
        );

        expect(Object.fromEntries(columns.map((column) => [column.name, column.column_type]))).toEqual({
            "stages.name": "varchar(30)",
            "llm_calls.error_code": "varchar(20)",
            "ai_insights.prompt_version": "varchar(10)",
            "imports.file_hash": "varchar(130)",
            "ai_insights.cache_key": "varchar(130)",
            "llm_calls.cache_key": "varchar(130)",
            "settings.ai_model": "varchar(100)",
            "ai_models.model_id": "varchar(100)",
            "ai_models.name": "varchar(100)",
        });
    });

    it("converts text dates in rows that were stored before", async () => {
        await migrator.down({ to: "20261116000004-right-size-columns.ts" });
        const importId = await insertImport("c".repeat(64));
        await sequelize.query(
            `INSERT INTO import_records
                (import_id, record_number, field_count, candidate_id, stage_entered_at, last_activity_at, last_contacted_at)
             VALUES (?, 2, 8, '001', '2026-11-01', '2026-02-30', '')`,
            { replacements: [importId] }
        );

        await migrator.up();

        const [row] = await sequelize.query<Record<string, unknown>>(
            `SELECT DATE_FORMAT(stage_entered_at, '%Y-%m-%d') AS entered, last_activity_at AS activity,
                    last_contacted_at AS contacted, invalid_dates AS invalid
             FROM import_records WHERE import_id = ?`,
            { replacements: [importId], type: QueryTypes.SELECT }
        );
        expect(row).toEqual({ entered: "2026-11-01", activity: null, contacted: null, invalid: ["last_activity_at"] });
        await sequelize.query("DELETE FROM imports WHERE id = ?", { replacements: [importId] });
    });

    it("does nothing when run again", async () => {
        expect(await migrator.up()).toEqual([]);
        expect(await migrator.pending()).toEqual([]);
    });

    it("seeds the 10 default stages in pipeline order and the settings row", async () => {
        await seeder.up();

        const stages = await sequelize.query<{
            name: string;
            type: string;
            threshold_days: number | null;
            position: number;
            aliases: string[];
            action_code: string | null;
        }>("SELECT name, type, threshold_days, position, aliases, action_code FROM stages ORDER BY position", {
            type: QueryTypes.SELECT,
        });

        expect(stages.map((s) => [s.position, s.name, s.type, s.threshold_days, s.action_code])).toEqual([
            [1, "Applied", "watched", 5, "REVIEW_APPLICATION"],
            [2, "Screening", "watched", 7, "SCHEDULE_SCREEN"],
            [3, "Interview", "watched", 14, "REQUEST_FEEDBACK"],
            [4, "Assessment", "watched", 7, "REVIEW_ASSESSMENT"],
            [5, "Reference check", "watched", 5, "CHASE_REFERENCES"],
            [6, "Offer", "watched", 3, "CONFIRM_OFFER"],
            [7, "On hold", "paused", null, null],
            [8, "Hired", "final", null, null],
            [9, "Rejected", "final", null, null],
            [10, "Withdrawn", "final", null, null],
        ]);
        expect(stages[0].aliases).toEqual(["New", "Sourced"]);
        expect(stages[9].aliases).toEqual(["Declined"]);

        const settings = await sequelize.query<{
            id: number;
            use_ai_drafts: number;
            ai_model: string;
            stages_version: number;
        }>("SELECT id, use_ai_drafts, ai_model, stages_version FROM settings", { type: QueryTypes.SELECT });
        expect(settings).toEqual([{ id: 1, use_ai_drafts: 1, ai_model: DEFAULT_AI_MODEL, stages_version: 1 }]);
    });

    it("does not seed twice", async () => {
        expect(await seeder.up()).toEqual([]);
        expect(await countRows("SELECT COUNT(*) AS total FROM stages", [])).toBe(10);
    });

    it("keeps the seed history apart from the migration history", async () => {
        const seedName = ["%default-stages-and-settings%"];
        const inMigrations = await countRows("SELECT COUNT(*) AS total FROM SequelizeMeta WHERE name LIKE ?", seedName);
        const inSeeds = await countRows("SELECT COUNT(*) AS total FROM SequelizeData WHERE name LIKE ?", seedName);

        expect([inMigrations, inSeeds]).toEqual([0, 1]);
    });

    it("rejects a second import with the same file hash", async () => {
        await insertImport("a".repeat(64));

        await expect(insertImport("a".repeat(64))).rejects.toBeInstanceOf(UniqueConstraintError);
        expect(await countRows("SELECT COUNT(*) AS total FROM imports", [])).toBe(1);
    });

    it("keeps candidate IDs exact: case-sensitive, leading zeros kept", async () => {
        const importId = await insertImport("b".repeat(64));
        await sequelize.query(
            "INSERT INTO import_records (import_id, record_number, field_count, candidate_id) VALUES (?, 2, 8, '0142'), (?, 3, 8, 'abc')",
            { replacements: [importId, importId] }
        );

        const sql = "SELECT COUNT(*) AS total FROM import_records WHERE import_id = ? AND candidate_id = ?";
        expect(await countRows(sql, [importId, "0142"])).toBe(1);
        expect(await countRows(sql, [importId, "142"])).toBe(0);
        expect(await countRows(sql, [importId, "ABC"])).toBe(0);
    });

    it("deleting an import removes its records and AI cache, but keeps the AI call log", async () => {
        const importId = await insertImport("c".repeat(64));
        await sequelize.query(
            "INSERT INTO import_records (import_id, record_number, field_count, candidate_id) VALUES (?, 2, 8, '001')",
            { replacements: [importId] }
        );
        await sequelize.query(
            "INSERT INTO ai_insights (import_id, cache_key, model, prompt_version, output) VALUES (?, ?, 'test-model', 'v1', '{}')",
            { replacements: [importId, "d".repeat(64)] }
        );
        await sequelize.query(
            "INSERT INTO llm_calls (import_id, cache_key, requested_model, latency_ms, status) VALUES (?, ?, 'test-model', 120, 'success')",
            { replacements: [importId, "d".repeat(64)] }
        );

        await sequelize.query("DELETE FROM imports WHERE id = ?", { replacements: [importId] });

        expect(await countRows("SELECT COUNT(*) AS total FROM import_records WHERE import_id = ?", [importId])).toBe(0);
        expect(await countRows("SELECT COUNT(*) AS total FROM ai_insights WHERE import_id = ?", [importId])).toBe(0);
        expect(await countRows("SELECT COUNT(*) AS total FROM llm_calls WHERE import_id IS NULL", [])).toBe(1);
    });

    it("undoes every migration and removes the tables", async () => {
        await seeder.down({ to: 0 });
        await migrator.down({ to: 0 });

        const tables = await listTables();
        APP_TABLES.forEach((table) => expect(tables).not.toContain(table));
    });
});
