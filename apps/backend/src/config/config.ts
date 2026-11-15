import "dotenv/config";
import Joi from "joi";
import { Dialect } from "sequelize";

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
	},
	logging: boolean;
	log: any;
}

interface Config {
	NODE_ENV: string;
	SEQUELIZE: SequelizeConfig;
	SEQUELIZEOPTIONS: SequelizeOptions;
	APPLICATION_SERVER_PORT: number;
	APP_FORCE_SHUTDOWN_SECOND: number;
}

// Every setting the API reads from the environment (.env locally, docker-compose in Docker).
// Checked once at startup so a wrong value fails fast with a clear message.
const envSchema = Joi.object({
	NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
	APPLICATION_SERVER_PORT: Joi.number().port().default(4000),
	APP_FORCE_SHUTDOWN_SECOND: Joi.number().integer().min(1).default(30),
	MYSQL_HOST: Joi.string().default("127.0.0.1"),
	MYSQL_PORT: Joi.number().port().default(3306),
	MYSQL_DATABASE: Joi.string().default("stallalert"),
	MYSQL_TEST_DATABASE: Joi.string().default(Joi.ref("MYSQL_DATABASE", { adjust: (name: string) => `${name}_test` })),
	MYSQL_USER: Joi.string().default("root"),
	MYSQL_PASSWORD: Joi.string().allow("").when("NODE_ENV", {
		is: "production",
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
		MYSQL_DATABASE: env.NODE_ENV === "test" ? env.MYSQL_TEST_DATABASE : env.MYSQL_DATABASE
	},
	SEQUELIZEOPTIONS: {
		host: env.MYSQL_HOST,
		port: env.MYSQL_PORT,
		dialect: "mysql",
		pool: {
			max: 20,
			min: 5,
			idle: 10000
		},
		define: {
			timestamps: false,
			charset: "utf8mb4",
			collate: "utf8mb4_0900_ai_ci"
		},
		logging: false,
		log: console.log
	},
	APPLICATION_SERVER_PORT: env.APPLICATION_SERVER_PORT,
	APP_FORCE_SHUTDOWN_SECOND: env.APP_FORCE_SHUTDOWN_SECOND
};

export default config;
