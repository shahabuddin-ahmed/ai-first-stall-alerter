import { Migration } from "../migrator";

interface TimeColumn {
    table: string;
    column: string;
    onUpdate: boolean;
    before: string;
}

const NOW = "CURRENT_TIMESTAMP(3)";

const TIME_COLUMNS: TimeColumn[] = [
    { table: "posts", column: "createdAt", onUpdate: false, before: "DATETIME NOT NULL" },
    { table: "posts", column: "updatedAt", onUpdate: true, before: "DATETIME NOT NULL" },
    { table: "imports", column: "created_at", onUpdate: false, before: `DATETIME(3) NOT NULL DEFAULT ${NOW}` },
    { table: "stages", column: "created_at", onUpdate: false, before: `DATETIME(3) NOT NULL DEFAULT ${NOW}` },
    {
        table: "stages",
        column: "updated_at",
        onUpdate: true,
        before: `DATETIME(3) NOT NULL DEFAULT ${NOW} ON UPDATE ${NOW}`,
    },
    {
        table: "settings",
        column: "updated_at",
        onUpdate: true,
        before: `DATETIME(3) NOT NULL DEFAULT ${NOW} ON UPDATE ${NOW}`,
    },
    { table: "ai_insights", column: "created_at", onUpdate: false, before: `DATETIME(3) NOT NULL DEFAULT ${NOW}` },
    { table: "llm_calls", column: "created_at", onUpdate: false, before: `DATETIME(3) NOT NULL DEFAULT ${NOW}` },
];

const timestampOf = ({ onUpdate }: TimeColumn): string =>
    `TIMESTAMP(3) NOT NULL DEFAULT ${NOW}${onUpdate ? ` ON UPDATE ${NOW}` : ""}`;

export const up: Migration = async ({ context: queryInterface }) => {
    for (const time of TIME_COLUMNS) {
        await queryInterface.sequelize.query(
            `ALTER TABLE \`${time.table}\` MODIFY \`${time.column}\` ${timestampOf(time)}`
        );
    }
};

export const down: Migration = async ({ context: queryInterface }) => {
    for (const time of TIME_COLUMNS) {
        await queryInterface.sequelize.query(`ALTER TABLE \`${time.table}\` MODIFY \`${time.column}\` ${time.before}`);
    }
};
