"use strict";

/**
 * Lightweight strategy contract.
 * A strategy module must export a `name` and an async `execute(context)`
 * function that returns a valid strategy result.
 */

/**
 * @typedef {Object} StrategyModule
 * @property {string} name
 * @property {(context: Object) => Promise<Object>} execute
 */

/**
 * Create a strategy module that follows the common contract.
 * @param {string} name Unique strategy name for logs/debugging.
 * @param {(context: Object) => Promise<Object>} execute Async strategy handler.
 * @returns {StrategyModule} Strategy module.
 */
function createStrategy(name, execute) {
    if (typeof name !== "string" || name.trim() === "") {
        throw new Error("strategy name is required");
    }

    if (typeof execute !== "function") {
        throw new Error(`strategy '${name}' requires an execute function`);
    }

    return {
        name,
        execute
    };
}

/**
 * Validate a strategy module before it enters the pipeline.
 * @param {StrategyModule} strategy Strategy module to validate.
 * @returns {{ valid: boolean, reason?: string }} Validation result.
 */
function validateStrategyModule(strategy) {
    if (!strategy || typeof strategy !== "object") {
        return { valid: false, reason: "strategy module must be an object" };
    }

    if (typeof strategy.name !== "string" || strategy.name.trim() === "") {
        return { valid: false, reason: "strategy module requires name" };
    }

    if (typeof strategy.execute !== "function") {
        return { valid: false, reason: "strategy module requires execute function" };
    }

    return { valid: true };
}

/**
 * Throw if a strategy module does not satisfy the shared strategy contract.
 * @param {StrategyModule} strategy Strategy module to validate.
 * @returns {StrategyModule} Validated strategy module.
 */
function assertValidStrategyModule(strategy) {
    const validation = validateStrategyModule(strategy);

    if (!validation.valid) {
        throw new Error(validation.reason);
    }

    return strategy;
}

module.exports = {
    createStrategy,
    validateStrategyModule,
    assertValidStrategyModule
};
