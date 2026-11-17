import { randomUUID } from "crypto";
import { QueryTypes } from "sequelize";
import { Migration } from "../migrator";

// The API shows this random ID instead of the number id, so imports cannot be guessed or counted
export const up: Migration = async ({ context: queryInterface }) => {
    const db = queryInterface.sequelize;
    await db.query("ALTER TABLE imports ADD COLUMN public_id CHAR(36) NULL AFTER id");

    const rows = await db.query<{ id: number }>("SELECT id FROM imports", { type: QueryTypes.SELECT });
    for (const row of rows) {
        await db.query("UPDATE imports SET public_id = ? WHERE id = ?", { replacements: [randomUUID(), row.id] });
    }

    await db.query(
        `ALTER TABLE imports
            MODIFY public_id CHAR(36) NOT NULL COMMENT 'Random ID used by the API; the number id never leaves the server',
            ADD UNIQUE KEY uq_imports_public_id (public_id)`
    );
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.sequelize.query("ALTER TABLE imports DROP INDEX uq_imports_public_id, DROP COLUMN public_id");
};
