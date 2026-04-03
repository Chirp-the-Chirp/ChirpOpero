"use strict";

jest.mock("../../../../src/utils/logger", () => ({
    createLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

const {
    matchRegistryItemByKeyword
} = require("../../../../src/orchestrator/helpers/triggerMatcher");
const flowRegistry = require("../../../../src/orchestrator/flows/flowRegistry");
const ruleRegistry = require("../../../../src/orchestrator/rules/ruleRegistry");

describe("triggerMatcher", () => {
    // These tests verify the shared keyword matcher used by both registries.

    test("matches keyword triggers correctly for flowRegistry", () => {
        const matched = matchRegistryItemByKeyword("order", flowRegistry);

        expect(matched).toEqual(flowRegistry.orderFlow);
    });

    test("matches keyword triggers correctly for ruleRegistry", () => {
        const matched = matchRegistryItemByKeyword("help", ruleRegistry);

        expect(matched).toEqual(ruleRegistry.helpRule);
    });

    test("handles unknown values safely", () => {
        expect(matchRegistryItemByKeyword("unknown", flowRegistry)).toBeNull();
        expect(matchRegistryItemByKeyword("unknown", ruleRegistry)).toBeNull();
    });

    test("ignores malformed registry entries safely", () => {
        const malformedRegistry = {
            badRule: {
                id: "badRule",
                trigger: {
                    type: "keyword",
                    values: "help"
                }
            }
        };

        expect(matchRegistryItemByKeyword("help", malformedRegistry)).toBeNull();
    });
});
