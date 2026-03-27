"use strict";

jest.mock("../../../src/utils/logger", () => ({
    createLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

const { orchestrate } = require("../../../src/orchestrator/conversationOrchestrator");
const { createConversationContext } = require("../fixtures/sampleData");

describe("ConversationOrchestrator", () => {
    // These tests verify pipeline behavior through the public orchestrate entry point.

    function buildInput(overrides = {}) {
        return {
            message: {
                messageId: "wamid.text.001",
                from: "94770000001",
                type: "text",
                text: "hello",
                timestamp: "1774078799"
            },
            conversation: createConversationContext(),
            customer: {
                customerId: "94770000001",
                name: null
            },
            metadata: {
                channel: "whatsapp"
            },
            ...overrides
        };
    }

    test("returns the greeting rule decision for hello", async () => {
        const decision = await orchestrate(buildInput());

        expect(decision.action).toBe("reply");
        expect(decision.source).toBe("rule_engine");
        expect(decision.response.text).toBe(
            "Hey there! How can I help you today?"
        );
    });

    test("returns the help rule decision for help messages", async () => {
        const decision = await orchestrate(
            buildInput({
                message: {
                    messageId: "wamid.text.002",
                    from: "94770000001",
                    type: "text",
                    text: "help",
                    timestamp: "1774078799"
                }
            })
        );

        expect(decision.action).toBe("reply");
        expect(decision.reason).toBe("matched help request");
    });

    test("returns the deterministic fallback when no strategy handles the text", async () => {
        const decision = await orchestrate(
            buildInput({
                message: {
                    messageId: "wamid.text.003",
                    from: "94770000001",
                    type: "text",
                    text: "where is my order",
                    timestamp: "1774078799"
                }
            })
        );

        expect(decision.action).toBe("reply");
        expect(decision.reason).toBe("fallback response");
        expect(decision.response.text).toBe(
            "Thanks for reaching out! I will get back to you shortly if needed."
        );
    });

    test("stops early with an error decision when required fields are missing", async () => {
        const decision = await orchestrate(
            buildInput({
                message: {
                    messageId: "wamid.text.004",
                    from: null,
                    type: "text",
                    text: "hello",
                    timestamp: "1774078799"
                }
            })
        );

        expect(decision.action).toBe("error");
        expect(decision.reason).toBe("missing sender in message payload");
    });
});
