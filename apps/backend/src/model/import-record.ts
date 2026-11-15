import { Model, DataTypes } from "sequelize";
import newSequelize from "../infra/sequelize";

export interface ImportRecordInterface {
    importId: number;
    recordNumber: number;
    fieldCount: number;
    candidateId: string;
    name: string;
    role: string;
    stage: string;
    stageEnteredAt: string;
    recruiter: string;
    lastActivityAt: string;
    lastContactedAt: string;
}

class ImportRecord extends Model<ImportRecordInterface> implements ImportRecordInterface {
    public importId!: number;
    public recordNumber!: number;
    public fieldCount!: number;
    public candidateId!: string;
    public name!: string;
    public role!: string;
    public stage!: string;
    public stageEnteredAt!: string;
    public recruiter!: string;
    public lastActivityAt!: string;
    public lastContactedAt!: string;
}

ImportRecord.init(
    {
        importId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            primaryKey: true,
        },
        recordNumber: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            primaryKey: true,
        },
        fieldCount: {
            type: DataTypes.SMALLINT.UNSIGNED,
            allowNull: false,
        },
        candidateId: {
            type: new DataTypes.STRING(255).BINARY,
            allowNull: true,
        },
        name: {
            type: new DataTypes.STRING(255),
            allowNull: true,
        },
        role: {
            type: new DataTypes.STRING(255),
            allowNull: true,
        },
        stage: {
            type: new DataTypes.STRING(255),
            allowNull: true,
        },
        stageEnteredAt: {
            type: new DataTypes.STRING(255),
            allowNull: true,
        },
        recruiter: {
            type: new DataTypes.STRING(255),
            allowNull: true,
        },
        lastActivityAt: {
            type: new DataTypes.STRING(255),
            allowNull: true,
        },
        lastContactedAt: {
            type: new DataTypes.STRING(255),
            allowNull: true,
        },
    },
    {
        tableName: "import_records",
        freezeTableName: true,
        timestamps: false,
        underscored: true,
        sequelize: newSequelize(),
        modelName: "import_records",
    }
);

export default ImportRecord;
