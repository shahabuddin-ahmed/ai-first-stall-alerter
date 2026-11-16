import { QueryInterface, Sequelize } from "sequelize";
import { SequelizeStorage, Umzug } from "umzug";

const MIGRATION_TABLE = "SequelizeMeta";
const SEEDER_TABLE = "SequelizeData";

const newRunner = (sequelize: Sequelize, folder: string, tableName: string): Umzug<QueryInterface> => {
    return new Umzug({
        migrations: { glob: [`${folder}/*.{ts,js}`, { cwd: __dirname, ignore: ["**/*.d.ts"] }] },
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({ sequelize, tableName, modelName: tableName }),
        logger: undefined,
    });
};

export const newMigrator = (sequelize: Sequelize): Umzug<QueryInterface> =>
    newRunner(sequelize, "migrations", MIGRATION_TABLE);

export const newSeeder = (sequelize: Sequelize): Umzug<QueryInterface> => newRunner(sequelize, "seeders", SEEDER_TABLE);

export type Migration = (params: { context: QueryInterface }) => Promise<void>;
