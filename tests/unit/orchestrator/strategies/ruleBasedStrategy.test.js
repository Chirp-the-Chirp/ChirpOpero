"use strict";

const ruleBasedStrategy = require("../../../../src/orchestrator/strategies/ruleBasedStrategy");

describe("ruleBasedStrategy", () => {
    // These tests lock down the current deterministic message routing rules.

    test.each(["hi", "hello", " Hello "])(
        "handles greeting phrase '%s'",
        async (text) => {
        const result = await ruleBasedStrategy.execute({
            message: {
                text
            },
            conversation: {},
            customer: {},
            metadata: {}
        });

            expect(result.handled).toBe(true);
            expect(result.decision.action).toBe("reply");
            expect(result.decision.response.text).toBe(
                "Hey there! How can I help you today?"
            );
        }
    );

    test("handles direct help requests", async () => {
        const result = await ruleBasedStrategy.execute({
            message: {
                text: "help"
            },
            conversation: {},
            customer: {},
            metadata: {}
        });

        expect(result.handled).toBe(true);
        expect(result.decision.reason).toBe("matched help request");
        expect(result.decision.response.text).toContain("Sure, I can help");
    });

    test("returns not handled for unknown text", async () => {
        const result = await ruleBasedStrategy.execute({
            message: {
                text: "pricing details"
            },
            conversation: {},
            customer: {},
            metadata: {}
        });

        expect(result).toEqual({
            handled: false,
            reason: "no rule-based match found"
        });
    });
});
