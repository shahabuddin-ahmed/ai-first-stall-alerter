import { Sequelize } from "sequelize";
import config from "../config/config";
import { DATABASE_CHARSET, DATABASE_COLLATION } from "../constant/env";

export class ConnectDB {
    private static instance: Sequelize;

    public static initialize(): Sequelize {
        return new Sequelize(
            config.SEQUELIZE.MYSQL_DATABASE,
            config.SEQUELIZE.MYSQL_USER,
            config.SEQUELIZE.MYSQL_PASSWORD,
            config.SEQUELIZEOPTIONS
        );
    }

    public static getInstance(): Sequelize {
        if (!this.instance) {
            this.instance = ConnectDB.initialize();
        }
        return this.instance;
    }
}

export const createDatabaseIfMissing = async (): Promise<void> => {
    const { MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD } = config.SEQUELIZE;
    const server = new Sequelize("", MYSQL_USER, MYSQL_PASSWORD, {
        ...config.SEQUELIZEOPTIONS,
        pool: { max: 1, min: 0 },
    });
    try {
        await server.query(
            `CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET ${DATABASE_CHARSET} COLLATE ${DATABASE_COLLATION}`
        );
    } finally {
        await server.close();
    }
};

const newSequelize = (): Sequelize => {
    return ConnectDB.getInstance();
};

export default newSequelize;
