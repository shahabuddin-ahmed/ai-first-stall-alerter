import config from "../../config/config";
import newSequelize from "../sequelize";
import { newMigrator, newSeeder } from "../migrator";

// Helpers for integration tests. They only ever touch a database whose name ends with "_test".
export const assertTestDatabase = (): void => {
    const name = config.SEQUELIZE.MYSQL_DATABASE;
    if (!name.endsWith("_test")) {
        throw new Error(`Refusing to change "${name}" in a test (the database name must end with _test)`);
    }
};

// Up-to-date tables, no imports, and only the default stages and settings.
export const resetTestDatabase = async (): Promise<void> => {
    assertTestDatabase();
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
