// The environments the API can run in (NODE_ENV).
export enum NodeEnv {
    DEVELOPMENT = "development",
    TEST = "test",
    PRODUCTION = "production",
}

// Tests only ever use a database whose name ends with this.
export const TEST_DATABASE_SUFFIX = "_test";
