import newSequelize from "./sequelize";
import { newMigrator, newSeeder } from "./migrator";

// Usage (see package.json):
//   yarn db:migrate         run all new migrations
//   yarn db:migrate:down    undo the last migration
//   yarn db:migrate:status  list done and pending migrations
//   yarn db:seed            add the default data (stages, settings)
//   yarn db:seed:down       remove the default data
type Command = "migrate" | "migrate:down" | "migrate:status" | "seed" | "seed:down";

const run = async (command: Command): Promise<void> => {
    const sequelize = newSequelize();
    const migrator = newMigrator(sequelize);
    const seeder = newSeeder(sequelize);

    try {
        switch (command) {
            case "migrate": {
                const done = await migrator.up();
                console.log(done.length ? `Migrated: ${done.map((m) => m.name).join(", ")}` : "No new migrations.");
                break;
            }
            case "migrate:down": {
                const undone = await migrator.down();
                console.log(undone.length ? `Undone: ${undone.map((m) => m.name).join(", ")}` : "Nothing to undo.");
                break;
            }
            case "migrate:status": {
                const executed = await migrator.executed();
                const pending = await migrator.pending();
                console.log(`Done (${executed.length}): ${executed.map((m) => m.name).join(", ") || "-"}`);
                console.log(`Pending (${pending.length}): ${pending.map((m) => m.name).join(", ") || "-"}`);
                break;
            }
            case "seed": {
                const done = await seeder.up();
                console.log(done.length ? `Seeded: ${done.map((m) => m.name).join(", ")}` : "No new seeds.");
                break;
            }
            case "seed:down": {
                const undone = await seeder.down({ to: 0 });
                console.log(
                    undone.length ? `Removed seeds: ${undone.map((m) => m.name).join(", ")}` : "No seeds to remove."
                );
                break;
            }
            default:
                throw new Error(
                    `Unknown command "${command}". Use: migrate, migrate:down, migrate:status, seed, seed:down`
                );
        }
    } finally {
        await sequelize.close();
    }
};

run(process.argv[2] as Command).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
