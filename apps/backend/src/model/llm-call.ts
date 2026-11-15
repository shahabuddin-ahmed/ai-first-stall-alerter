import { Model, DataTypes } from "sequelize";
import newSequelize from "../infra/sequelize";
import { LlmCallStatus } from "../constant/ai";

export interface LlmCallInterface {
    id?: number;
    importId: number | null;
    cacheKey: string;
    requestedModel: string;
    servedModel: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: number | null;
    latencyMs: number;
    status: LlmCallStatus;
    errorCode: string | null;
    createdAt?: Date;
}

class LlmCall extends Model<LlmCallInterface> implements LlmCallInterface {
    public id?: number;
    public importId!: number | null;
    public cacheKey!: string;
    public requestedModel!: string;
    public servedModel!: string | null;
    public inputTokens!: number | null;
    public outputTokens!: number | null;
    public costUsd!: number | null;
    public latencyMs!: number;
    public status!: LlmCallStatus;
    public errorCode!: string | null;
    public readonly createdAt?: Date;
}

LlmCall.init(
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        importId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        cacheKey: {
            type: new DataTypes.CHAR(64),
            allowNull: false,
        },
        requestedModel: {
            type: new DataTypes.STRING(100),
            allowNull: false,
        },
        servedModel: {
            type: new DataTypes.STRING(100),
            allowNull: true,
        },
        inputTokens: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        outputTokens: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        costUsd: {
            type: new DataTypes.DECIMAL(12, 6),
            allowNull: true,
        },
        latencyMs: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(...Object.values(LlmCallStatus)),
            allowNull: false,
        },
        errorCode: {
            type: new DataTypes.STRING(40),
            allowNull: true,
        },
    },
    {
        tableName: "llm_calls",
        freezeTableName: true,
        timestamps: true,
        updatedAt: false,
        underscored: true,
        sequelize: newSequelize(),
        modelName: "llm_calls",
    }
);

export default LlmCall;
