import { Model, DataTypes } from "sequelize";
import newSequelize from "../infra/sequelize";

export interface ImportInterface {
    id?: number;
    fileName: string;
    fileHash: string;
    fileSize: number;
    headerCount: number;
    recordCount: number;
    createdAt?: Date;
}

class Import extends Model<ImportInterface> implements ImportInterface {
    public id?: number;
    public fileName!: string;
    public fileHash!: string;
    public fileSize!: number;
    public headerCount!: number;
    public recordCount!: number;
    public readonly createdAt?: Date;
}

Import.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        fileName: {
            type: new DataTypes.STRING(255),
            allowNull: false,
        },
        fileHash: {
            type: new DataTypes.CHAR(64),
            allowNull: false,
        },
        fileSize: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        headerCount: {
            type: DataTypes.SMALLINT.UNSIGNED,
            allowNull: false,
        },
        recordCount: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
    },
    {
        tableName: "imports",
        freezeTableName: true,
        timestamps: true,
        updatedAt: false,
        underscored: true,
        sequelize: newSequelize(),
        modelName: "imports",
    }
);

export default Import;
