import "dotenv/config";
import Joi from "joi";
import { Options } from "sequelize";
import { ReasoningEffort } from "../constant/ai";
import { DATABASE_CHARSET, DATABASE_COLLATION, NodeEnv, TEST_DATABASE_SUFFIX } from "../constant/env";

interface AppConfig {
    NODE_ENV: NodeEnv;
    APPLICATION_SERVER_PORT: number;
    APP_FORCE_SHUTDOWN_SECOND: number;
}

interface DatabaseConfig {
    MYSQL_HOST: string;
    MYSQL_PORT: number;
    MYSQL_DATABASE: string;
    MYSQL_TEST_DATABASE: string;
    MYSQL_USER: string;
    MYSQL_PASSWORD: string;
}

export interface AiConfig {
    AI_API_KEY: string;
    AI_BASE_URL: string;
    AI_TOP_N: number;
    AI_TIMEOUT_MS: number;
    AI_MAX_OUTPUT_TOKENS: number;
    AI_REASONING_EFFORT: ReasoningEffort;
}

interface SecurityConfig {
    WEB_ORIGIN: string[];
    RATE_LIMIT_UPLOADS_PER_MINUTE: number;
    RATE_LIMIT_INSIGHTS_PER_MINUTE: number;
}

interface Config extends AppConfig {
    SEQUELIZE: DatabaseConfig;
    SEQUELIZEOPTIONS: Options;
    AI: AiConfig;
    SECURITY: SecurityConfig;
}

interface Env extends AppConfig, DatabaseConfig, AiConfig, SecurityConfig {}

const envSchema = Joi.object<Env>({
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
    MYSQL_PASSWORD: Joi.string()
        .allow("")
        .when("NODE_ENV", { is: NodeEnv.PRODUCTION, then: Joi.required(), otherwise: Joi.string().default("root") }),

    AI_API_KEY: Joi.string().allow("").default(""),
    AI_BASE_URL: Joi.string()
        .uri({ scheme: ["https", "http"] })
        .replace(/\/+$/, "")
        .default("https://openrouter.ai/api/v1"),
    AI_TOP_N: Joi.number().integer().min(1).max(20).default(5),
    AI_TIMEOUT_MS: Joi.number().integer().min(1000).max(120000).default(15000),
    AI_MAX_OUTPUT_TOKENS: Joi.number().integer().min(200).max(8000).default(1500),
    AI_REASONING_EFFORT: Joi.string()
        .valid(...Object.values(ReasoningEffort))
        .default(ReasoningEffort.LOW),

    WEB_ORIGIN: Joi.string()
        .custom((value: string) =>
            value
                .split(",")
                .map((origin) => origin.trim())
                .filter(Boolean)
        )
        .default(["http://localhost:3000"]),
    RATE_LIMIT_UPLOADS_PER_MINUTE: Joi.number().integer().min(1).max(1000).default(20),
    RATE_LIMIT_INSIGHTS_PER_MINUTE: Joi.number().integer().min(1).max(1000).default(10),
}).unknown(true);

const { value: env, error } = envSchema.validate(process.env, { abortEarly: false });

if (error) {
    throw new Error(`Invalid environment settings: ${error.details.map((detail) => detail.message).join("; ")}`);
}

const config: Config = {
    NODE_ENV: env.NODE_ENV,
    APPLICATION_SERVER_PORT: env.APPLICATION_SERVER_PORT,
    APP_FORCE_SHUTDOWN_SECOND: env.APP_FORCE_SHUTDOWN_SECOND,
    SEQUELIZE: {
        MYSQL_HOST: env.MYSQL_HOST,
        MYSQL_PORT: env.MYSQL_PORT,
        MYSQL_DATABASE: env.NODE_ENV === NodeEnv.TEST ? env.MYSQL_TEST_DATABASE : env.MYSQL_DATABASE,
        MYSQL_TEST_DATABASE: env.MYSQL_TEST_DATABASE,
        MYSQL_USER: env.MYSQL_USER,
        MYSQL_PASSWORD: env.MYSQL_PASSWORD,
    },
    SEQUELIZEOPTIONS: {
        host: env.MYSQL_HOST,
        port: env.MYSQL_PORT,
        dialect: "mysql",
        pool: { max: 20, min: 5, idle: 10000 },
        define: { timestamps: false, charset: DATABASE_CHARSET, collate: DATABASE_COLLATION },
        logging: false,
    },
    AI: {
        AI_API_KEY: env.AI_API_KEY,
        AI_BASE_URL: env.AI_BASE_URL,
        AI_TOP_N: env.AI_TOP_N,
        AI_TIMEOUT_MS: env.AI_TIMEOUT_MS,
        AI_MAX_OUTPUT_TOKENS: env.AI_MAX_OUTPUT_TOKENS,
        AI_REASONING_EFFORT: env.AI_REASONING_EFFORT,
    },
    SECURITY: {
        WEB_ORIGIN: env.WEB_ORIGIN,
        RATE_LIMIT_UPLOADS_PER_MINUTE: env.RATE_LIMIT_UPLOADS_PER_MINUTE,
        RATE_LIMIT_INSIGHTS_PER_MINUTE: env.RATE_LIMIT_INSIGHTS_PER_MINUTE,
    },
};

export default config;
