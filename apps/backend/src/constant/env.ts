export enum NodeEnv {
    DEVELOPMENT = "development",
    TEST = "test",
    PRODUCTION = "production",
}

export const TEST_DATABASE_SUFFIX = "_test";

export const DATABASE_CHARSET = "utf8mb4";

export const DATABASE_COLLATION = "utf8mb4_0900_ai_ci";

export enum DbCommand {
    MIGRATE = "migrate",
    MIGRATE_DOWN = "migrate:down",
    MIGRATE_STATUS = "migrate:status",
    SEED = "seed",
    SEED_DOWN = "seed:down",
}
