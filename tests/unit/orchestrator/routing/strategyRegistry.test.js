"use strict";

const {
    createStrategy
} = require("../../../../src/orchestrator/contracts/strategyContract");
const {
    StrategyRegistry,
    createStrategyRegistry
} = require("../../../../src/orchestrator/routing/strategyRegistry");

describe("StrategyRegistry", () => {
    test("registers and resolves strategies by key", () => {
        const strategy = createStrategy("ruleBasedStrategy", async () => ({
            handled: false,
            reason: "skipped"
        }));
        const registry = new StrategyRegistry();

        registry.register("ruleBasedStrategy", strategy);

        expect(registry.has("ruleBasedStrategy")).toBe(true);
        expect(registry.resolve("ruleBasedStrategy")).toBe(strategy);
        expect(registry.list()).toEqual(["ruleBasedStrategy"]);
    });

    test("returns null for missing strategies", () => {
        const registry = createStrategyRegistry();

        expect(registry.resolve("missingStrategy")).toBeNull();
    });

    test("builds a registry from object entries", () => {
        const customStrategy = createStrategy("customStrategy", async () => ({
            handled: false,
            reason: "skipped"
        }));

        const registry = createStrategyRegistry({
            customStrategy
        });

        expect(registry.resolve("customStrategy")).toBe(customStrategy);
    });
});
