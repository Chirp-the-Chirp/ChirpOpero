"use strict";

jest.mock("../../../src/utils/logger", () => ({
    createLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

jest.mock("../../../src/services/conversation-state.service", () => ({
    getConversationState: jest.fn()
}));

const { orchestrate } = require("../../../src/orchestrator/conversationOrchestrator");
const ConversationStateService = require("../../../src/services/conversation-state.service");
const { createConversationContext } = require("../fixtures/sampleData");
const {
    CONVERSATION_STATES
} = require("../../../src/orchestrator/conversationStateTypes");
const flowRegistry = require("../../../src/orchestrator/flows/flowRegistry");
const ruleRegistry = require("../../../src/orchestrator/rules/ruleRegistry");

describe("ConversationOrchestrator", () => {
    // These tests verify pipeline behavior through the public orchestrate entry point.

    beforeEach(() => {
        jest.clearAllMocks();
        ConversationStateService.getConversationState.mockResolvedValue({
            state: null,
            lastRoute: null,
            lastHandledAt: null
        });
    });

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
        expect(decision.response.text).toBe(ruleRegistry.greetingHello.response.text);
    });

    test("lets stateStrategy handle supported active states before rule-based routing", async () => {
        ConversationStateService.getConversationState.mockResolvedValue({
            state: CONVERSATION_STATES.WAITING_FOR_ORDER_ID,
            lastRoute: "rule_engine",
            lastHandledAt: "2026-03-27T10:00:00.000Z"
        });

        const decision = await orchestrate(
            buildInput({
                message: {
                    messageId: "wamid.text.100",
                    from: "94770000001",
                    type: "text",
                    text: "hello",
                    timestamp: "1774078799"
                }
            })
        );

        expect(decision.action).toBe("reply");
        expect(decision.reason).toBe("handled WAITING_FOR_ORDER_ID state");
        expect(decision.response.text).toBe("Checking your order...");
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
        expect(decision.reason).toBe("matched helpRule");
        expect(decision.response.text).toBe(ruleRegistry.helpRule.response.text);
    });

    test("starts a flow through ruleBasedStrategy when no active state exists", async () => {
        const decision = await orchestrate(
            buildInput({
                message: {
                    messageId: "wamid.text.050",
                    from: "94770000001",
                    type: "text",
                    text: flowRegistry.orderFlow.trigger.values[0],
                    timestamp: "1774078799"
                }
            })
        );

        expect(decision.action).toBe("reply");
        expect(decision.response.text).toBe(
            flowRegistry.orderFlow.entry.response.text
        );
        expect(decision.nextState).toBe(flowRegistry.orderFlow.entry.state);
        expect(decision.reason).toBe("started orderFlow");
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
