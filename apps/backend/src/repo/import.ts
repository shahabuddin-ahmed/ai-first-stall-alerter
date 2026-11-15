import { Transaction } from "sequelize";
import { BOARD_LIMITS } from "../constant/board";
import Import, { ImportInterface } from "../model/import";
import ImportRecord from "../model/import-record";
import { BoardRecord } from "../rules/types";

export interface ImportRepoInterface {
    create(details: ImportInterface, records: BoardRecord[], transaction: Transaction): Promise<ImportInterface>;
    findById(id: number): Promise<ImportInterface | null>;
    findByHash(fileHash: string): Promise<ImportInterface | null>;
    list(offset: number, limit: number): Promise<ImportInterface[]>;
    count(): Promise<number>;
    listRecords(importId: number): Promise<BoardRecord[]>;
    delete(id: number): Promise<boolean>;
}

export class ImportRepo implements ImportRepoInterface {
    public async create(
        details: ImportInterface,
        records: BoardRecord[],
        transaction: Transaction
    ): Promise<ImportInterface> {
        const created = await Import.create(details, { transaction });
        const importId = created.get("id") as number;

        for (let start = 0; start < records.length; start += BOARD_LIMITS.INSERT_BATCH_SIZE) {
            await ImportRecord.bulkCreate(
                records.slice(start, start + BOARD_LIMITS.INSERT_BATCH_SIZE).map((record) => ({ ...record, importId })),
                { transaction }
            );
        }
        return created.get({ plain: true }) as ImportInterface;
    }

    public async findById(id: number): Promise<ImportInterface | null> {
        const found = await Import.findByPk(id);
        return found ? (found.get({ plain: true }) as ImportInterface) : null;
    }

    public async findByHash(fileHash: string): Promise<ImportInterface | null> {
        const found = await Import.findOne({ where: { fileHash } });
        return found ? (found.get({ plain: true }) as ImportInterface) : null;
    }

    public async list(offset: number, limit: number): Promise<ImportInterface[]> {
        const imports = await Import.findAll({
            offset,
            limit,
            order: [
                ["createdAt", "DESC"],
                ["id", "DESC"],
            ],
        });
        return imports.map((found) => found.get({ plain: true }) as ImportInterface);
    }

    public async count(): Promise<number> {
        return Import.count();
    }

    public async listRecords(importId: number): Promise<BoardRecord[]> {
        const records = await ImportRecord.findAll({
            where: { importId },
            order: [["recordNumber", "ASC"]],
            attributes: { exclude: ["importId"] },
            raw: true,
        });
        return records as unknown as BoardRecord[];
    }

    public async delete(id: number): Promise<boolean> {
        const deleted = await Import.destroy({ where: { id } });
        return deleted > 0;
    }
}

export const newImportRepo = async (): Promise<ImportRepoInterface> => {
    return new ImportRepo();
};

export default ImportRepo;
