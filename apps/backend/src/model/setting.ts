import { Model, DataTypes } from "sequelize";
import newSequelize from "../infra/sequelize";

export interface SettingInterface {
    id: number;
    useAiDrafts: boolean;
    stagesVersion: number;
    updatedAt?: Date;
}

class Setting extends Model<SettingInterface> implements SettingInterface {
    public id!: number;
    public useAiDrafts!: boolean;
    public stagesVersion!: number;
    public readonly updatedAt?: Date;
}

Setting.init(
    {
        id: {
            type: DataTypes.TINYINT.UNSIGNED,
            primaryKey: true,
        },
        useAiDrafts: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
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
        createdAt: false,
        underscored: true,
        sequelize: newSequelize(),
        modelName: "settings",
    }
);

export default Setting;
