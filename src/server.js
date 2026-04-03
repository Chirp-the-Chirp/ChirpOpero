"use strict";

const app = require("./app");
const env = require("./config/env");
const RedisService = require("./services/redis.service");
const { createLogger } = require("./utils/logger");

const logger = createLogger("Server");

async function startServer() {
    try {
        env.checkEnvVariables();
        await RedisService.init();

        const listener = app.listen(env.port, () => {
            logger.info(`The app is listening on port ${listener.address().port}`);
            logger.info("Application is starting...");
        });
    } catch (error) {
        logger.error("Failed to start server", error);
        process.exit(1);
    }
}

startServer();
