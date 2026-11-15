import { QueryInterface, Sequelize } from "sequelize";
import { SequelizeStorage, Umzug } from "umzug";

// Migrations change the tables; seeders add the default data. Each keeps its own history table,
// so every file runs exactly once per database.
const MIGRATION_TABLE = "SequelizeMeta";
const SEEDER_TABLE = "SequelizeData";

const newRunner = (sequelize: Sequelize, folder: string, tableName: string): Umzug<QueryInterface> => {
    return new Umzug({
        // .ts when run with ts-node, .js after `yarn build`
        migrations: { glob: [`${folder}/*.{ts,js}`, { cwd: __dirname, ignore: ["**/*.d.ts"] }] },
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({ sequelize, tableName }),
        logger: undefined,
    });
};

export const newMigrator = (sequelize: Sequelize): Umzug<QueryInterface> =>
    newRunner(sequelize, "migrations", MIGRATION_TABLE);

export const newSeeder = (sequelize: Sequelize): Umzug<QueryInterface> => newRunner(sequelize, "seeders", SEEDER_TABLE);

export type Migration = (params: { context: QueryInterface }) => Promise<void>;
