import { Transaction } from "sequelize";
import { PIPELINE_LIMITS } from "../constant/pipeline";
import Import, { ImportInterface } from "../model/import";
import ImportRecord, { ImportRecordInterface } from "../model/import-record";

export interface ImportRepoInterface {
    create(details: ImportInterface, transaction: Transaction): Promise<ImportInterface>;
    createRecords(records: ImportRecordInterface[], transaction: Transaction): Promise<void>;
    findById(id: number): Promise<ImportInterface | null>;
    findByHash(fileHash: string): Promise<ImportInterface | null>;
    list(offset: number, limit: number): Promise<ImportInterface[]>;
    count(): Promise<number>;
    listRecords(importId: number): Promise<ImportRecordInterface[]>;
    delete(id: number): Promise<number>;
}

export class ImportRepo implements ImportRepoInterface {
    public async create(details: ImportInterface, transaction: Transaction): Promise<ImportInterface> {
        return Import.create(details, { transaction });
    }

    public async createRecords(records: ImportRecordInterface[], transaction: Transaction): Promise<void> {
        const batchSize = PIPELINE_LIMITS.INSERT_BATCH_SIZE;
        for (let start = 0; start < records.length; start += batchSize) {
            const batch = records.slice(start, start + batchSize);
            await ImportRecord.bulkCreate(batch, { transaction });
        }
    }

    public async findById(id: number): Promise<ImportInterface | null> {
        return Import.findByPk(id);
    }

    public async findByHash(fileHash: string): Promise<ImportInterface | null> {
        return Import.findOne({ where: { fileHash } });
    }

    public async list(offset: number, limit: number): Promise<ImportInterface[]> {
        return Import.findAll({
            offset,
            limit,
            order: [
                ["createdAt", "DESC"],
                ["id", "DESC"],
            ],
        });
    }

    public async count(): Promise<number> {
        return Import.count();
    }

    public async listRecords(importId: number): Promise<ImportRecordInterface[]> {
        return ImportRecord.findAll({
            where: { importId },
            order: [["recordNumber", "ASC"]],
            attributes: { exclude: ["id", "importId", "createdAt", "updatedAt"] },
            raw: true,
        });
    }

    public async delete(id: number): Promise<number> {
        return Import.destroy({ where: { id } });
    }
}

export const newImportRepo = async (): Promise<ImportRepoInterface> => {
    return new ImportRepo();
};

export default ImportRepo;
