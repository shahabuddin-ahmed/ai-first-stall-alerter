export enum NodeEnv {
    DEVELOPMENT = "development",
    TEST = "test",
    PRODUCTION = "production",
}

export const TEST_DATABASE_SUFFIX = "_test";

export enum DbCommand {
    MIGRATE = "migrate",
    MIGRATE_DOWN = "migrate:down",
    MIGRATE_STATUS = "migrate:status",
    SEED = "seed",
    SEED_DOWN = "seed:down",
}
