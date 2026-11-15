import { Model, DataTypes } from "sequelize";
import newSequelize from "../infra/sequelize";
import { AiOutput } from "../ai/guardrails";

export interface AiInsightInterface {
    id?: number;
    importId: number;
    cacheKey: string;
    model: string;
    promptVersion: string;
    output: AiOutput;
    createdAt?: Date;
}

class AiInsight extends Model<AiInsightInterface> implements AiInsightInterface {
    public id?: number;
    public importId!: number;
    public cacheKey!: string;
    public model!: string;
    public promptVersion!: string;
    public output!: AiOutput;
    public readonly createdAt?: Date;
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
            type: new DataTypes.CHAR(64),
            allowNull: false,
        },
        model: {
            type: new DataTypes.STRING(100),
            allowNull: false,
        },
        promptVersion: {
            type: new DataTypes.STRING(20),
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
        updatedAt: false,
        underscored: true,
        sequelize: newSequelize(),
        modelName: "ai_insights",
    }
);

export default AiInsight;
