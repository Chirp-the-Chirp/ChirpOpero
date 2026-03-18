"use strict";

require("dotenv").config();

const REQUIRED_ENV_VARS = [
    "ACCESS_TOKEN",
    "APP_SECRET",
    "VERIFY_TOKEN",
    "REDIS_HOST",
    "REDIS_PORT"
];

function checkEnvVariables() {
    REQUIRED_ENV_VARS.forEach((key) => {
        if (!process.env[key]) {
        console.warn(`WARNING: Missing environment variable ${key}`);
        }
    });
}

module.exports = Object.freeze({
    appSecret: process.env.APP_SECRET,
    accessToken: process.env.ACCESS_TOKEN,
    verifyToken: process.env.VERIFY_TOKEN,

    port: process.env.PORT || 8080,
    redisHost: process.env.REDIS_HOST || "localhost",
    redisPort: process.env.REDIS_PORT || 6379,

    checkEnvVariables
});