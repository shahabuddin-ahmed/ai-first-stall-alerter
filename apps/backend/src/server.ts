import app, { appReady } from "./app";
import http from "http";
import config from "./config/config";
import newSequelize from "./infra/sequelize";

const logger = console;

const gracefulShutdown = (server: http.Server, forcedTimeout: number) => {
    return function () {
        logger.info("Received SIGINT or SIGTERM. Shutting down gracefully...");
        server.close(async () => {
            logger.info("Closed out remaining connections.");
            await newSequelize()
                .close()
                .then(() => logger.info("Database connection closed."))
                .catch(() => logger.error("Could not close the database connection."));
            process.exit();
        });

        setTimeout(() => {
            logger.error("Could not close connections in time, forcefully shutting down");
            process.exit();
        }, forcedTimeout);
    };
};

const server = http.createServer(app);

const forcedShutdownMs = config.APP_FORCE_SHUTDOWN_SECOND * 1000;
process.on("SIGTERM", gracefulShutdown(server, forcedShutdownMs));
process.on("SIGINT", gracefulShutdown(server, forcedShutdownMs));

// Accept requests only when the database, stages and settings are ready.
appReady
    .then(() => {
        server.listen(config.APPLICATION_SERVER_PORT, () => {
            logger.info(`StallAlert API is running on port: ${config.APPLICATION_SERVER_PORT}`);
        });
    })
    .catch((err) => {
        logger.error("StallAlert API could not start:", err instanceof Error ? err.message : err);
        process.exit(1);
    });
