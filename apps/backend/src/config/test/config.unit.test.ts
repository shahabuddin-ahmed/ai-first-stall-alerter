// Checks how the API reads its settings. The .env file is ignored here so each test controls the environment.
jest.mock("dotenv/config", () => ({}));

const ORIGINAL_ENV = process.env;

const loadConfig = (env: Record<string, string | undefined>) => {
    process.env = { ...env } as NodeJS.ProcessEnv;
    let loaded: unknown;
    jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- a fresh copy per test
        loaded = require("../config").default;
    });
    return loaded as typeof import("../config").default;
};

afterEach(() => {
    process.env = ORIGINAL_ENV;
});

describe("config", () => {
    it("uses safe defaults for local development", () => {
        const config = loadConfig({ NODE_ENV: "development" });

        expect(config.APPLICATION_SERVER_PORT).toBe(4000);
        expect(config.SEQUELIZE.MYSQL_DATABASE).toBe("stallalert");
        expect(config.SEQUELIZEOPTIONS.port).toBe(3306);
    });

    it("always uses the test database when tests run", () => {
        const config = loadConfig({ NODE_ENV: "test", MYSQL_DATABASE: "stallalert" });

        expect(config.SEQUELIZE.MYSQL_DATABASE).toBe("stallalert_test");
    });

    it("uses MYSQL_TEST_DATABASE when it is set", () => {
        const config = loadConfig({ NODE_ENV: "test", MYSQL_TEST_DATABASE: "my_tests" });

        expect(config.SEQUELIZE.MYSQL_DATABASE).toBe("my_tests");
    });

    it("stops with a clear message when a value is wrong", () => {
        expect(() => loadConfig({ NODE_ENV: "development", MYSQL_PORT: "abc" })).toThrow(
            /Invalid environment settings: "MYSQL_PORT" must be a number/
        );
    });

    it("requires a database password in production", () => {
        expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(/"MYSQL_PASSWORD" is required/);
        expect(loadConfig({ NODE_ENV: "production", MYSQL_PASSWORD: "secret" }).SEQUELIZE.PASSWORD).toBe("secret");
    });
});
