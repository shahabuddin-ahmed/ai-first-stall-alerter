import { Sequelize } from "sequelize";
import config from "../config/config";

// One shared connection pool for the whole process.
export class ConnectDB {
    private static instance: Sequelize;

    public static initialize(): Sequelize {
        return new Sequelize(
            config.SEQUELIZE.MYSQL_DATABASE,
            config.SEQUELIZE.USERNAME,
            config.SEQUELIZE.PASSWORD,
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

const newSequelize = (): Sequelize => {
    return ConnectDB.getInstance();
};

export default newSequelize;
