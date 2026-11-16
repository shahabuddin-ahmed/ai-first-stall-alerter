import { Model, DataTypes } from "sequelize";
import newSequelize from "../infra/sequelize";
import { StageConfig } from "../rules/types";
import { ActionCode, STAGE_LIMITS, StageType } from "../constant/stage";

export interface StageInterface extends StageConfig {
    id?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

class Stage extends Model<StageInterface> implements StageInterface {
    public id?: number;
    public name!: string;
    public type!: StageType;
    public thresholdDays!: number | null;
    public position!: number;
    public aliases!: string[];
    public actionCode!: ActionCode | null;
    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;
}

Stage.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: new DataTypes.STRING(STAGE_LIMITS.MAX_NAME_LENGTH),
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM(...Object.values(StageType)),
            allowNull: false,
        },
        thresholdDays: {
            type: DataTypes.SMALLINT.UNSIGNED,
            allowNull: true,
        },
        position: {
            type: DataTypes.SMALLINT.UNSIGNED,
            allowNull: false,
        },
        aliases: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },
        actionCode: {
            type: DataTypes.ENUM(...Object.values(ActionCode)),
            allowNull: true,
        },
    },
    {
        tableName: "stages",
        freezeTableName: true,
        timestamps: true,
        underscored: true,
        sequelize: newSequelize(),
        modelName: "stages",
    }
);

export default Stage;
