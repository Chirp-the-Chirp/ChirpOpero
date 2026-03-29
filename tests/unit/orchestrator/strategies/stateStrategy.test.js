"use strict";

jest.mock("../../../../src/utils/logger", () => ({
    createLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

jest.mock("../../../../src/services/conversation-state.service", () => ({
    getConversationState: jest.fn()
}));

jest.mock("../../../../src/orchestrator/flows/flowRegistry.helpers", () => ({
    findFlowByState: jest.fn(),
    resolveStateHandler: jest.fn()
}));

const stateStrategy = require("../../../../src/orchestrator/strategies/stateStrategy");
const ConversationStateService = require("../../../../src/services/conversation-state.service");
const {
    findFlowByState,
    resolveStateHandler
} = require("../../../../src/orchestrator/flows/flowRegistry.helpers");
const {
    CONVERSATION_STATES
} = require("../../../../src/orchestrator/conversationStateTypes");

describe("stateStrategy", () => {
    // These tests cover active-flow continuation without introducing new flow starts.

    beforeEach(() => {
        jest.clearAllMocks();
    });

    function createContext(text = "12345") {
        return {
            message: {
                messageId: "wamid.text.001",
                from: "94770000001",
                type: "text",
                text,
                timestamp: "1774078799"
            },
            conversation: {},
            customer: {
                customerId: "94770000001"
            },
            metadata: {
                channel: "whatsapp"
            }
        };
    }

    test("returns handled false when no active state exists", async () => {
        ConversationStateService.getConversationState.mockResolvedValue({
            state: null
        });

        const result = await stateStrategy.execute(createContext());

        expect(result).toEqual({
            handled: false,
            reason: "no active conversation state"
        });
    });

    test("returns handled false for unsupported active states", async () => {
        ConversationStateService.getConversationState.mockResolvedValue({
            state: "UNKNOWN_ACTIVE_STATE"
        });
        findFlowByState.mockReturnValue(null);

        const result = await stateStrategy.execute(createContext());

        expect(result).toEqual({
            handled: false,
            reason: "unsupported active state: UNKNOWN_ACTIVE_STATE"
        });
        expect(findFlowByState).toHaveBeenCalledWith("UNKNOWN_ACTIVE_STATE");
    });

    test("resolves WAITING_FOR_ORDER_ID through the registry and calls the correct handler", async () => {
        ConversationStateService.getConversationState.mockResolvedValue({
            state: CONVERSATION_STATES.WAITING_FOR_ORDER_ID
        });
        findFlowByState.mockReturnValue({
            id: "orderFlow"
        });
        const mockHandler = jest.fn().mockReturnValue({
            handled: true,
            decision: {
                action: "reply",
                source: "rule_engine",
                response: {
                    type: "text",
                    text: "Checking your order..."
                },
                nextState: null,
                handoffRequired: false,
                reason: "handled WAITING_FOR_ORDER_ID state",
                confidence: 0.95
            },
            reason: "continued WAITING_FOR_ORDER_ID flow"
        });
        resolveStateHandler.mockReturnValue(mockHandler);

        const result = await stateStrategy.execute(createContext("ORD-10001"));

        expect(findFlowByState).toHaveBeenCalledWith(
            CONVERSATION_STATES.WAITING_FOR_ORDER_ID
        );
        expect(resolveStateHandler).toHaveBeenCalledWith(
            CONVERSATION_STATES.WAITING_FOR_ORDER_ID
        );
        expect(mockHandler).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.objectContaining({
                    text: "ORD-10001"
                })
            })
        );
        expect(result.handled).toBe(true);
        expect(result.reason).toBe("continued WAITING_FOR_ORDER_ID flow");
        expect(result.decision).toEqual({
            action: "reply",
            source: "rule_engine",
            response: {
                type: "text",
                text: "Checking your order..."
            },
            nextState: null,
            handoffRequired: false,
            reason: "handled WAITING_FOR_ORDER_ID state",
            confidence: 0.95
        });
    });

    test("returns handled false when the registry has no concrete handler for a supported state", async () => {
        ConversationStateService.getConversationState.mockResolvedValue({
            state: CONVERSATION_STATES.WAITING_FOR_ORDER_ID
        });
        findFlowByState.mockReturnValue({
            id: "orderFlow"
        });
        resolveStateHandler.mockReturnValue(null);

        const result = await stateStrategy.execute(createContext("ORD-10001"));

        expect(result).toEqual({
            handled: false,
            reason: "missing state handler for active state: WAITING_FOR_ORDER_ID"
        });
    });
});
