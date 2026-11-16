import { Model, DataTypes } from "sequelize";
import newSequelize from "../infra/sequelize";
import { BoardColumn, TEXT_COLUMN_LIMITS } from "../constant/board";
import { RecordText } from "../service/hiring-board/types";

export interface ImportRecordInterface extends RecordText {
    id?: number;
    importId: number;
    stageEnteredAt: string | null;
    lastActivityAt: string | null;
    lastContactedAt: string | null;
    invalidDates: BoardColumn[] | null;
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
    public invalidDates!: BoardColumn[] | null;
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
            type: new DataTypes.STRING(TEXT_COLUMN_LIMITS[BoardColumn.CANDIDATE_ID]).BINARY,
            allowNull: true,
        },
        name: {
            type: new DataTypes.STRING(TEXT_COLUMN_LIMITS[BoardColumn.NAME]),
            allowNull: true,
        },
        role: {
            type: new DataTypes.STRING(TEXT_COLUMN_LIMITS[BoardColumn.ROLE]),
            allowNull: true,
        },
        stage: {
            type: new DataTypes.STRING(TEXT_COLUMN_LIMITS[BoardColumn.STAGE]),
            allowNull: true,
        },
        stageEnteredAt: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        recruiter: {
            type: new DataTypes.STRING(TEXT_COLUMN_LIMITS[BoardColumn.RECRUITER]),
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
