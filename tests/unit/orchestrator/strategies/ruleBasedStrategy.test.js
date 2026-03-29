"use strict";

jest.mock("../../../../src/utils/logger", () => ({
    createLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

const ruleBasedStrategy = require("../../../../src/orchestrator/strategies/ruleBasedStrategy");
const flowRegistry = require("../../../../src/orchestrator/flows/flowRegistry");
const ruleRegistry = require("../../../../src/orchestrator/rules/ruleRegistry");

describe("ruleBasedStrategy", () => {
    // These tests lock down deterministic flow-starts and static one-shot rules.

    function createContext(text) {
        return {
            message: {
                text
            },
            conversation: {},
            customer: {},
            metadata: {}
        };
    }

    test("starts orderFlow from flowRegistry when the message is 'order'", async () => {
        const result = await ruleBasedStrategy.execute(createContext("order"));

        expect(result.handled).toBe(true);
        expect(result.reason).toBe("matched flow trigger for orderFlow");
        expect(result.decision.response.text).toBe(
            flowRegistry.orderFlow.entry.response.text
        );
        expect(result.decision.nextState).toBe(
            flowRegistry.orderFlow.entry.state
        );
        expect(result.decision.reason).toBe("started orderFlow");
    });

    test("matches 'hi' from ruleRegistry", async () => {
        const result = await ruleBasedStrategy.execute(createContext("hi"));

        expect(result.handled).toBe(true);
        expect(result.reason).toBe("matched static rule greetingHi");
        expect(result.decision.response).toEqual(ruleRegistry.greetingHi.response);
        expect(result.decision.nextState).toBeNull();
    });

    test("matches 'hello' from ruleRegistry", async () => {
        const result = await ruleBasedStrategy.execute(createContext("hello"));

        expect(result.handled).toBe(true);
        expect(result.reason).toBe("matched static rule greetingHello");
        expect(result.decision.response).toEqual(
            ruleRegistry.greetingHello.response
        );
        expect(result.decision.nextState).toBeNull();
    });

    test("matches 'help' from ruleRegistry", async () => {
        const result = await ruleBasedStrategy.execute(createContext("help"));

        expect(result.handled).toBe(true);
        expect(result.reason).toBe("matched static rule helpRule");
        expect(result.decision.response).toEqual(ruleRegistry.helpRule.response);
        expect(result.decision.nextState).toBeNull();
    });

    test("returns handled false for unknown input", async () => {
        const result = await ruleBasedStrategy.execute(
            createContext("pricing details")
        );

        expect(result).toEqual({
            handled: false,
            reason: "no rule-based match found"
        });
    });
});
