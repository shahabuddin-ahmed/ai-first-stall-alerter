import { Model, DataTypes } from "sequelize";
import newSequelize from "../infra/sequelize";
import { PipelineColumn, TEXT_COLUMN_LIMITS } from "../constant/pipeline";
import { RecordText } from "../service/pipeline-types";

export interface ImportRecordInterface extends RecordText {
    id?: number;
    importId: number;
    stageEnteredAt: string | null;
    lastActivityAt: string | null;
    lastContactedAt: string | null;
    invalidDates: PipelineColumn[] | null;
    createdAt?: Date;
    updatedAt?: Date;
}

class ImportRecord extends Model<ImportRecordInterface> implements ImportRecordInterface {
    public id?: number;
    public importId!: number;
    public recordNumber!: number;
    public fieldCount!: number;
    public candidateId!: string;
    public name!: string;
    public role!: string;
    public stage!: string;
    public stageEnteredAt!: string | null;
    public recruiter!: string;
    public lastActivityAt!: string | null;
    public lastContactedAt!: string | null;
    public invalidDates!: PipelineColumn[] | null;
    public readonly createdAt?: Date;
    public readonly updatedAt?: Date;
}

ImportRecord.init(
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
        recordNumber: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        fieldCount: {
            type: DataTypes.SMALLINT.UNSIGNED,
            allowNull: false,
        },
        candidateId: {
            type: new DataTypes.STRING(TEXT_COLUMN_LIMITS[PipelineColumn.CANDIDATE_ID]).BINARY,
            allowNull: true,
        },
        name: {
            type: new DataTypes.STRING(TEXT_COLUMN_LIMITS[PipelineColumn.NAME]),
            allowNull: true,
        },
        role: {
            type: new DataTypes.STRING(TEXT_COLUMN_LIMITS[PipelineColumn.ROLE]),
            allowNull: true,
        },
        stage: {
            type: new DataTypes.STRING(TEXT_COLUMN_LIMITS[PipelineColumn.STAGE]),
            allowNull: true,
        },
        stageEnteredAt: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        recruiter: {
            type: new DataTypes.STRING(TEXT_COLUMN_LIMITS[PipelineColumn.RECRUITER]),
            allowNull: true,
        },
        lastActivityAt: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        lastContactedAt: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        invalidDates: {
            type: DataTypes.JSON,
            allowNull: true,
        },
    },
    {
        tableName: "import_records",
        freezeTableName: true,
        timestamps: true,
        underscored: true,
        sequelize: newSequelize(),
        modelName: "import_records",
    }
);

export default ImportRecord;
