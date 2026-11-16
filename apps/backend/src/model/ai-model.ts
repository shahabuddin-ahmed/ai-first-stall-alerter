import { Model, DataTypes } from "sequelize";
import newSequelize from "../infra/sequelize";
import { AI_COLUMN_LIMITS } from "../constant/ai";

export interface AiModelInterface {
    id?: number;
    modelId: string;
    name: string;
    contextLength: number | null;
    createdAt?: Date;
    updatedAt?: Date;
}

class AiModel extends Model<AiModelInterface> implements AiModelInterface {
    public id?: number;
    public modelId!: string;
    public name!: string;
    public contextLength!: number | null;
    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;
}

AiModel.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        modelId: {
            type: new DataTypes.STRING(AI_COLUMN_LIMITS.MODEL_ID),
            allowNull: false,
        },
        name: {
            type: new DataTypes.STRING(AI_COLUMN_LIMITS.MODEL_NAME),
            allowNull: false,
        },
        contextLength: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
    },
    {
        tableName: "ai_models",
        freezeTableName: true,
        timestamps: true,
        underscored: true,
        sequelize: newSequelize(),
        modelName: "ai_models",
    }
);

export default AiModel;
