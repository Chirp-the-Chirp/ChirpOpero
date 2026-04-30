"use strict";

const {
    assertValidStrategyModule
} = require("../contracts/strategyContract");

/**
 * Strategy registry keeps strategy resolution outside the orchestrator so new
 * strategies can be added by registration instead of by editing orchestration code.
 */

function assertValidStrategyKey(strategyKey) {
    if (typeof strategyKey !== "string" || strategyKey.trim() === "") {
        throw new Error("strategy key is required");
    }

    return strategyKey;
}

class StrategyRegistry {
    constructor(initialEntries = []) {
        this.registry = new Map();

        for (const [strategyKey, strategy] of initialEntries) {
            this.register(strategyKey, strategy);
        }
    }

    register(strategyKey, strategy) {
        const validStrategyKey = assertValidStrategyKey(strategyKey);
        const validStrategy = assertValidStrategyModule(strategy);

        this.registry.set(validStrategyKey, validStrategy);
        return this;
    }

    resolve(strategyKey) {
        const validStrategyKey = assertValidStrategyKey(strategyKey);
        return this.registry.get(validStrategyKey) || null;
    }

    has(strategyKey) {
        const validStrategyKey = assertValidStrategyKey(strategyKey);
        return this.registry.has(validStrategyKey);
    }

    list() {
        return Array.from(this.registry.keys());
    }

    entries() {
        return Array.from(this.registry.entries());
    }
}

function createStrategyRegistry(initialEntries = []) {
    if (Array.isArray(initialEntries)) {
        return new StrategyRegistry(initialEntries);
    }

    if (!initialEntries || typeof initialEntries !== "object") {
        throw new Error("strategy registry entries must be an array or object");
    }

    return new StrategyRegistry(Object.entries(initialEntries));
}

module.exports = {
    StrategyRegistry,
    createStrategyRegistry
};
