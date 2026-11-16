import { Model, DataTypes } from "sequelize";
import newSequelize from "../infra/sequelize";
import { AiUsage } from "../service/ai-provider";
import { AI_COLUMN_LIMITS, AiErrorCode, LlmCallStatus } from "../constant/ai";
import { HASH_COLUMN_LENGTH } from "../constant/hash";

export interface LlmCallInterface extends AiUsage {
    id?: number;
    importId: number | null;
    cacheKey: string;
    requestedModel: string;
    latencyMs: number;
    status: LlmCallStatus;
    errorCode: AiErrorCode | null;
    createdAt?: Date;
    updatedAt?: Date;
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
    public errorCode!: AiErrorCode | null;
    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;
}

LlmCall.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        importId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
        },
        cacheKey: {
            type: new DataTypes.STRING(HASH_COLUMN_LENGTH),
            allowNull: false,
        },
        requestedModel: {
            type: new DataTypes.STRING(AI_COLUMN_LIMITS.MODEL_ID),
            allowNull: false,
        },
        servedModel: {
            type: new DataTypes.STRING(AI_COLUMN_LIMITS.MODEL_ID),
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
            type: new DataTypes.STRING(AI_COLUMN_LIMITS.ERROR_CODE),
            allowNull: true,
        },
    },
    {
        tableName: "llm_calls",
        freezeTableName: true,
        timestamps: true,
        underscored: true,
        sequelize: newSequelize(),
        modelName: "llm_calls",
    }
);

export default LlmCall;
