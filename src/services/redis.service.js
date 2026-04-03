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

/**
 * Lazily connect to Redis once and reuse the same client for later calls.
 * @returns {Promise<void>}
 */
async function connectRedis() {
    if (!isConnected) {
        await client.connect();
        isConnected = true;
        logger.info("Redis connected");
    }
}

class RedisService {
    /**
     * Initialize the shared Redis client.
     * @returns {Promise<void>}
     */
    static async init() {
        await connectRedis();
    }

    /**
     * Set a raw string value in Redis with an optional TTL.
     * @param {string} key Redis key.
     * @param {string} value String value to persist.
     * @param {number} [ttlSeconds] Optional TTL in seconds.
     * @returns {Promise<void>}
     */
    static async set(key, value, ttlSeconds) {
        await connectRedis();
        await client.set(key, value);

        if (ttlSeconds) {
            await client.expire(key, ttlSeconds);
        }
    }

    /**
     * Read a raw string value from Redis.
     * @param {string} key Redis key.
     * @returns {Promise<string|null>} Stored value or null.
     */
    static async get(key) {
        await connectRedis();
        return client.get(key);
    }

    /**
     * Persist a JSON-serializable value in Redis.
     * @param {string} key Redis key.
     * @param {Object} value JSON-serializable value.
     * @param {number} [ttlSeconds] Optional TTL in seconds.
     * @returns {Promise<void>}
     */
    static async setJson(key, value, ttlSeconds) {
        await this.set(key, JSON.stringify(value), ttlSeconds);
    }

    /**
     * Read and parse a JSON value from Redis.
     * @param {string} key Redis key.
     * @returns {Promise<Object|null>} Parsed object or null.
     */
    static async getJson(key) {
        const value = await this.get(key);
        return value ? JSON.parse(value) : null;
    }

    /**
     * Store a short-lived marker key used by legacy follow-up flows.
     * @param {string} key Redis key.
     * @returns {Promise<void>}
     */
    static async insert(key) {
        await connectRedis();
        await client.set(key, "");

        // Keep marker keys short-lived because they only guard immediate follow-up logic.
        await client.expire(key, 15);
    }

    /**
     * Remove a key and report whether anything was deleted.
     * @param {string} key Redis key.
     * @returns {Promise<boolean>} True when a key existed and was removed.
     */
    static async remove(key) {
        await connectRedis();
        const resp = await client.del(key);
        return resp > 0;
    }
}

module.exports = RedisService;
