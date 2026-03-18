"use strict";

const app = require("./app");
const env = require("./config/env");
const RedisService = require("./services/redis.service");

async function startServer() {
    try {
        env.checkEnvVariables();
        await RedisService.init();

        const listener = app.listen(env.port, () => {
            console.log(`The app is listening on port ${listener.address().port}`);
            console.log("Application is starting...!");
            
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();