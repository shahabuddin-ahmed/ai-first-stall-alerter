import { Model, DataTypes } from "sequelize";
import newSequelize from "../infra/sequelize";
import { AI_COLUMN_LIMITS } from "../constant/ai";

export interface SettingInterface {
    id: number;
    useAiDrafts: boolean;
    aiModel: string;
    stagesVersion: number;
    createdAt?: Date;
    updatedAt?: Date;
}

class Setting extends Model<SettingInterface> implements SettingInterface {
    public id!: number;
    public useAiDrafts!: boolean;
    public aiModel!: string;
    public stagesVersion!: number;
    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;
}

Setting.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        useAiDrafts: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        aiModel: {
            type: new DataTypes.STRING(AI_COLUMN_LIMITS.MODEL_ID),
            allowNull: false,
        },
        stagesVersion: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 1,
        },
    },
    {
        tableName: "settings",
        freezeTableName: true,
        timestamps: true,
        underscored: true,
        sequelize: newSequelize(),
        modelName: "settings",
    }
);

export default Setting;
