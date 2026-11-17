import { Model, DataTypes } from "sequelize";
import newSequelize from "../infra/sequelize";
import { HASH_COLUMN_LENGTH, PUBLIC_ID_LENGTH } from "../constant/hash";
import { PIPELINE_LIMITS } from "../constant/pipeline";

export interface ImportInterface {
    id?: number;
    publicId: string;
    fileName: string;
    fileHash: string;
    fileSize: number;
    headerCount: number;
    recordCount: number;
    createdAt?: Date;
    updatedAt?: Date;
}

class Import extends Model<ImportInterface> implements ImportInterface {
    public id?: number;
    public publicId!: string;
    public fileName!: string;
    public fileHash!: string;
    public fileSize!: number;
    public headerCount!: number;
    public recordCount!: number;
    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;
}

Import.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        publicId: {
            type: new DataTypes.CHAR(PUBLIC_ID_LENGTH),
            allowNull: false,
        },
        fileName: {
            type: new DataTypes.STRING(PIPELINE_LIMITS.MAX_FILE_NAME_LENGTH),
            allowNull: false,
        },
        fileHash: {
            type: new DataTypes.STRING(HASH_COLUMN_LENGTH),
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
        underscored: true,
        sequelize: newSequelize(),
        modelName: "imports",
    }
);

export default Import;
