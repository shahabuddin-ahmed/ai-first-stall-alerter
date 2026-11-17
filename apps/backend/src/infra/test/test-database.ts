import config from "../../config/config";
import { TEST_DATABASE_SUFFIX } from "../../constant/env";
import newSequelize, { createDatabaseIfMissing } from "../sequelize";
import { newMigrator, newSeeder } from "../migrator";

// Helpers for integration tests. They only ever touch a database whose name ends with TEST_DATABASE_SUFFIX.
export const assertTestDatabase = (): void => {
    const name = config.SEQUELIZE.MYSQL_DATABASE;
    if (!name.endsWith(TEST_DATABASE_SUFFIX)) {
        throw new Error(
            `Refusing to change "${name}" in a test (the database name must end with ${TEST_DATABASE_SUFFIX})`
        );
    }
};

// Up-to-date tables, no imports, and only the default stages and settings.
export const resetTestDatabase = async (): Promise<void> => {
    assertTestDatabase();
    await createDatabaseIfMissing();
    const sequelize = newSequelize();
    await newMigrator(sequelize).up();

    const seeder = newSeeder(sequelize);
    await seeder.down({ to: 0 });
    await sequelize.query("DELETE FROM llm_calls");
    await sequelize.query("DELETE FROM imports");
    await sequelize.query("DELETE FROM stages");
    await sequelize.query("DELETE FROM settings");
    await seeder.up();
};
