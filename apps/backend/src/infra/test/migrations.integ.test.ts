import { QueryTypes, UniqueConstraintError } from "sequelize";
import config from "../../config/config";
import newSequelize from "../sequelize";
import { newMigrator, newSeeder } from "../migrator";

// Needs MySQL with the test database (docker compose up db). Runs against MYSQL_TEST_DATABASE only.
const sequelize = newSequelize();
const migrator = newMigrator(sequelize);
const seeder = newSeeder(sequelize);

const APP_TABLES = ["ai_insights", "import_records", "imports", "llm_calls", "posts", "settings", "stages"];

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
    if (!config.SEQUELIZE.MYSQL_DATABASE.endsWith("_test")) {
        throw new Error(
            `Refusing to run migration tests on "${config.SEQUELIZE.MYSQL_DATABASE}" (name must end with _test)`
        );
    }
    // Start from an empty database.
    await seeder.down({ to: 0 });
    await migrator.down({ to: 0 });
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
        const done = await migrator.up();

        expect(done).toHaveLength(7);
        expect(await listTables()).toEqual(expect.arrayContaining(APP_TABLES));
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

        const settings = await sequelize.query<{ id: number; use_ai_drafts: number; stages_version: number }>(
            "SELECT id, use_ai_drafts, stages_version FROM settings",
            { type: QueryTypes.SELECT }
        );
        expect(settings).toEqual([{ id: 1, use_ai_drafts: 1, stages_version: 1 }]);
    });

    it("does not seed twice", async () => {
        expect(await seeder.up()).toEqual([]);
        expect(await countRows("SELECT COUNT(*) AS total FROM stages", [])).toBe(10);
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
