import "dotenv/config";
import Joi from "joi";
import { Dialect } from "sequelize";
import { AiMode, ReasoningEffort } from "../constant/ai";
import { NodeEnv, TEST_DATABASE_SUFFIX } from "../constant/env";

interface SequelizeConfig {
    USERNAME: string;
    PASSWORD: string;
    MYSQL_DATABASE: string;
}

interface SequelizeOptions {
    host: string;
    port: number;
    dialect: Dialect;
    pool: {
        max: number;
        min: number;
        idle: number;
    };
    define: {
        timestamps: boolean;
        charset: string;
        collate: string;
    };
    logging: boolean;
    log: any;
}

export interface AiConfig {
    API_KEY: string;
    MODEL: string;
    BASE_URL: string;
    TOP_N: number;
    TIMEOUT_MS: number;
    MAX_OUTPUT_TOKENS: number;
    MODE: AiMode;
    REASONING_EFFORT: ReasoningEffort;
}

interface Config {
    NODE_ENV: string;
    SEQUELIZE: SequelizeConfig;
    SEQUELIZEOPTIONS: SequelizeOptions;
    APPLICATION_SERVER_PORT: number;
    APP_FORCE_SHUTDOWN_SECOND: number;
    AI: AiConfig;
    SECURITY: {
        WEB_ORIGINS: string[];
        UPLOADS_PER_MINUTE: number;
        INSIGHTS_PER_MINUTE: number;
    };
}

// Every setting the API reads from the environment (.env locally, docker-compose in Docker).
// Checked once at startup so a wrong value fails fast with a clear message.
const envSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid(...Object.values(NodeEnv))
        .default(NodeEnv.DEVELOPMENT),
    APPLICATION_SERVER_PORT: Joi.number().port().default(4000),
    APP_FORCE_SHUTDOWN_SECOND: Joi.number().integer().min(1).default(30),
    MYSQL_HOST: Joi.string().default("127.0.0.1"),
    MYSQL_PORT: Joi.number().port().default(3306),
    MYSQL_DATABASE: Joi.string().default("stallalert"),
    MYSQL_TEST_DATABASE: Joi.string().default(
        Joi.ref("MYSQL_DATABASE", { adjust: (name: string) => `${name}${TEST_DATABASE_SUFFIX}` })
    ),
    MYSQL_USER: Joi.string().default("root"),
    // AI drafts run only when both are set (and the team setting is on). Never sent to the browser.
    AI_API_KEY: Joi.string().allow("").default(""),
    AI_MODEL: Joi.string().allow("").default(""),
    AI_BASE_URL: Joi.string()
        .uri({ scheme: ["https", "http"] })
        .default("https://openrouter.ai/api/v1"),
    AI_TOP_N: Joi.number().integer().min(1).max(20).default(5),
    AI_TIMEOUT_MS: Joi.number().integer().min(1000).max(60000).default(15000),
    AI_MAX_OUTPUT_TOKENS: Joi.number().integer().min(200).max(8000).default(1500),
    // fake = a built-in AI stand-in with no network calls (tests, demos without a key)
    AI_MODE: Joi.string()
        .valid(...Object.values(AiMode))
        .default(AiMode.LIVE),
    // How much "thinking" a reasoning model may do: off = no thinking (fastest), low/medium/high,
    // none = do not send the setting (for models without thinking).
    AI_REASONING_EFFORT: Joi.string()
        .valid(...Object.values(ReasoningEffort))
        .default(ReasoningEffort.LOW),
    // Browsers may call the API only from these origins (comma-separated), e.g. the Next.js app.
    WEB_ORIGIN: Joi.string().default("http://localhost:3000"),
    // Per IP address, per minute. One API process keeps the counts in memory.
    RATE_LIMIT_UPLOADS_PER_MINUTE: Joi.number().integer().min(1).max(1000).default(20),
    RATE_LIMIT_INSIGHTS_PER_MINUTE: Joi.number().integer().min(1).max(1000).default(10),
    MYSQL_PASSWORD: Joi.string()
        .allow("")
        .when("NODE_ENV", {
            is: NodeEnv.PRODUCTION,
            then: Joi.required(),
            otherwise: Joi.string().allow("").default("root"),
        }),
}).unknown(true);

const { value: env, error } = envSchema.validate(process.env, { abortEarly: false });

if (error) {
    throw new Error(`Invalid environment settings: ${error.details.map((detail) => detail.message).join("; ")}`);
}

const config: Config = {
    NODE_ENV: env.NODE_ENV,
    SEQUELIZE: {
        USERNAME: env.MYSQL_USER,
        PASSWORD: env.MYSQL_PASSWORD,
        // Tests always use their own database, never the development one.
        MYSQL_DATABASE: env.NODE_ENV === NodeEnv.TEST ? env.MYSQL_TEST_DATABASE : env.MYSQL_DATABASE,
    },
    SEQUELIZEOPTIONS: {
        host: env.MYSQL_HOST,
        port: env.MYSQL_PORT,
        dialect: "mysql",
        pool: {
            max: 20,
            min: 5,
            idle: 10000,
        },
        define: {
            timestamps: false,
            charset: "utf8mb4",
            collate: "utf8mb4_0900_ai_ci",
        },
        logging: false,
        log: console.log,
    },
    APPLICATION_SERVER_PORT: env.APPLICATION_SERVER_PORT,
    APP_FORCE_SHUTDOWN_SECOND: env.APP_FORCE_SHUTDOWN_SECOND,
    AI: {
        API_KEY: env.AI_API_KEY,
        MODEL: env.AI_MODEL,
        BASE_URL: env.AI_BASE_URL.replace(/\/+$/, ""),
        TOP_N: env.AI_TOP_N,
        TIMEOUT_MS: env.AI_TIMEOUT_MS,
        MAX_OUTPUT_TOKENS: env.AI_MAX_OUTPUT_TOKENS,
        MODE: env.AI_MODE,
        REASONING_EFFORT: env.AI_REASONING_EFFORT,
    },
    SECURITY: {
        WEB_ORIGINS: env.WEB_ORIGIN.split(",")
            .map((origin: string) => origin.trim())
            .filter(Boolean),
        UPLOADS_PER_MINUTE: env.RATE_LIMIT_UPLOADS_PER_MINUTE,
        INSIGHTS_PER_MINUTE: env.RATE_LIMIT_INSIGHTS_PER_MINUTE,
    },
};

export default config;
