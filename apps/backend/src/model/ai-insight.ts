import { Model, DataTypes } from "sequelize";
import newSequelize from "../infra/sequelize";
import { AiOutput } from "../service/ai";
import { AI_COLUMN_LIMITS } from "../constant/ai";
import { HASH_COLUMN_LENGTH } from "../constant/hash";

export interface AiInsightInterface {
    id?: number;
    importId: number;
    cacheKey: string;
    model: string;
    promptVersion: string;
    output: AiOutput;
    createdAt?: Date;
    updatedAt?: Date;
}

class AiInsight extends Model<AiInsightInterface> implements AiInsightInterface {
    public id?: number;
    public importId!: number;
    public cacheKey!: string;
    public model!: string;
    public promptVersion!: string;
    public output!: AiOutput;
    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;
}

AiInsight.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        importId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        cacheKey: {
            type: new DataTypes.STRING(HASH_COLUMN_LENGTH),
            allowNull: false,
        },
        model: {
            type: new DataTypes.STRING(AI_COLUMN_LIMITS.MODEL_ID),
            allowNull: false,
        },
        promptVersion: {
            type: new DataTypes.STRING(AI_COLUMN_LIMITS.PROMPT_VERSION),
            allowNull: false,
        },
        output: {
            type: DataTypes.JSON,
            allowNull: false,
        },
    },
    {
        tableName: "ai_insights",
        freezeTableName: true,
        timestamps: true,
        underscored: true,
        sequelize: newSequelize(),
        modelName: "ai_insights",
    }
);

export default AiInsight;
