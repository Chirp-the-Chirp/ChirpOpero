"use strict";

const redis = require("redis");
const env = require("../config/env");
const { createLogger } = require("../utils/logger");

const logger = createLogger("RedisService");

const client = redis.createClient({
    socket: {
        host: env.redisHost,
        port: env.redisPort
    }
});

client.on("error", (err) => {
    logger.error("Redis Client Error", err);
});

let isConnected = false;

async function connectRedis() {
    if (!isConnected) {
        await client.connect();
        isConnected = true;
        logger.info("Redis connected");
    }
}

class RedisService {
    static async init() {
        await connectRedis();
    }

    static async insert(key) {
        await connectRedis();
        await client.set(key, "");

        // expire after 15 seconds
        await client.expire(key, 15);
    }

    static async remove(key) {
        await connectRedis();
        const resp = await client.del(key);
        return resp > 0;
    }
}

module.exports = RedisService;
