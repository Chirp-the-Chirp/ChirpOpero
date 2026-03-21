"use strict";

const LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const DEFAULT_LEVEL = process.env.LOG_LEVEL
    ? process.env.LOG_LEVEL.toLowerCase()
    : "debug";

class Logger {
    constructor(context = "app", level = DEFAULT_LEVEL) {
        this.context = context;
        this.levelThreshold =
            LEVELS[level] !== undefined ? LEVELS[level] : LEVELS.info;
    }

    log(level, message, meta) {
        if (!Logger.shouldLog(level, this.levelThreshold)) {
            return;
        }

        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]`;
        const parts = [prefix, message];

        if (meta !== undefined) {
            parts.push(
                typeof meta === "string" ? meta : JSON.stringify(meta, null, 2)
            );
        }

        const printer = Logger.getPrinter(level);
        printer(...parts);
    }

    static shouldLog(level, threshold) {
        const levelValue = LEVELS[level];
        if (levelValue === undefined) {
            return false;
        }
        return levelValue <= threshold;
    }

    static getPrinter(level) {
        switch (level) {
            case "error":
                return console.error;
            case "warn":
                return console.warn;
            case "info":
                return console.info;
            case "debug":
            default:
                return console.log;
        }
    }

    error(message, meta) {
        this.log("error", message, meta);
    }

    warn(message, meta) {
        this.log("warn", message, meta);
    }

    info(message, meta) {
        this.log("info", message, meta);
    }

    debug(message, meta) {
        this.log("debug", message, meta);
    }
}

function createLogger(context, level) {
    return new Logger(context, level);
}

module.exports = {
    createLogger
};
