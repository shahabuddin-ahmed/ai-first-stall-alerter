import { Sequelize } from "sequelize";
import newSequelize from "./sequelize";
import { newMigrator } from "./migrator";

export const initializeDBConnection = async (): Promise<Sequelize> => {
    const sequelize = newSequelize();
    try {
        await sequelize.authenticate();
        console.log("Connected successfully to the database server");
    } catch (err) {
        console.log("Failed to connect the database server");
        if (err instanceof Error) {
            console.log(err.stack);
        } else {
            console.log(err);
        }
        process.exit(1);
    }

    // Tables are created by migrations (yarn db:migrate), never by sequelize.sync().
    // Starting with an out-of-date schema would fail later in confusing ways, so stop here instead.
    const pending = await newMigrator(sequelize).pending();
    if (pending.length > 0) {
        console.log(`The database has ${pending.length} pending migration(s): ${pending.map((m) => m.name).join(", ")}`);
        console.log("Run `yarn db:migrate` (and `yarn db:seed` on a new database), then start the API again.");
        process.exit(1);
    }

    return sequelize;
};

export default initializeDBConnection;
