"use strict";

const preCheckStrategy = require("../../../../src/orchestrator/strategies/preCheckStrategy");

describe("preCheckStrategy", () => {
    // These tests cover the guard rails that stop invalid inputs early.

    test("returns an error decision when sender is missing", async () => {
        const result = await preCheckStrategy.execute({
            message: {
                from: null,
                type: "text"
            },
            conversation: {},
            customer: {},
            metadata: {}
        });

        expect(result.handled).toBe(true);
        expect(result.decision.action).toBe("error");
        expect(result.decision.reason).toBe("missing sender in message payload");
    });

    test("returns an error decision when message type is missing", async () => {
        const result = await preCheckStrategy.execute({
            message: {
                from: "94770000001",
                type: null
            },
            conversation: {},
            customer: {},
            metadata: {}
        });

        expect(result.handled).toBe(true);
        expect(result.decision.action).toBe("error");
        expect(result.decision.reason).toBe("missing message type in payload");
    });

    test("allows the pipeline to continue when required fields exist", async () => {
        const result = await preCheckStrategy.execute({
            message: {
                from: "94770000001",
                type: "text"
            },
            conversation: {},
            customer: {},
            metadata: {}
        });

        expect(result).toEqual({
            handled: false,
            reason: "pre-checks passed"
        });
    });
});
