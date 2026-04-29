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
    STATE_HANDLER_OUTCOMES
} = require("../../../../src/orchestrator/contracts/stateHandlerOutcomeContract");
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

        expect(result).toMatchObject({
            handled: false,
            outcome: "CONTINUE",
            reason: "no active conversation state"
        });
    });

    test("returns handled false for unsupported active states", async () => {
        ConversationStateService.getConversationState.mockResolvedValue({
            state: "UNKNOWN_ACTIVE_STATE"
        });
        findFlowByState.mockReturnValue(null);

        const result = await stateStrategy.execute(createContext());

        expect(result).toMatchObject({
            handled: false,
            outcome: "CONTINUE",
            reason: "unsupported active state: UNKNOWN_ACTIVE_STATE"
        });
        expect(findFlowByState).toHaveBeenCalledWith("UNKNOWN_ACTIVE_STATE");
    });

    test("maps transition outcomes to the next state from the handler", async () => {
        ConversationStateService.getConversationState.mockResolvedValue({
            state: CONVERSATION_STATES.WAITING_FOR_ORDER_ID
        });
        findFlowByState.mockReturnValue({
            id: "orderFlow"
        });
        const mockHandler = jest.fn().mockReturnValue({
            status: STATE_HANDLER_OUTCOMES.TRANSITION,
            decision: {
                action: "reply",
                source: "rule_engine",
                response: {
                    type: "text",
                    text: "Please confirm your order ID"
                },
                nextState: null,
                handoffRequired: false,
                reason: "transitioned order flow",
                confidence: 0.95
            },
            nextState: "WAITING_FOR_ORDER_CONFIRMATION"
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
        expect(result).toMatchObject({
            handled: true,
            outcome: "RESPOND",
            decision: {
                action: "reply",
                source: "rule_engine",
                response: {
                    type: "text",
                    text: "Please confirm your order ID"
                },
                nextState: "WAITING_FOR_ORDER_CONFIRMATION",
                handoffRequired: false,
                reason: "transitioned order flow",
                confidence: 0.95
            },
            reason: "continued WAITING_FOR_ORDER_ID flow with transition"
        });
    });

    test("keeps the same active state for retry outcomes", async () => {
        ConversationStateService.getConversationState.mockResolvedValue({
            state: CONVERSATION_STATES.WAITING_FOR_ORDER_ID
        });
        findFlowByState.mockReturnValue({
            id: "orderFlow"
        });
        resolveStateHandler.mockReturnValue(
            jest.fn().mockReturnValue({
                status: STATE_HANDLER_OUTCOMES.RETRY,
                decision: {
                    action: "reply",
                    source: "rule_engine",
                    response: {
                        type: "text",
                        text: "Please resend your order ID"
                    },
                    nextState: null,
                    handoffRequired: false,
                    reason: "retry order id collection",
                    confidence: 0.8
                },
                nextState: null
            })
        );

        const result = await stateStrategy.execute(createContext("bad-input"));

        expect(result.decision.nextState).toBe(
            CONVERSATION_STATES.WAITING_FOR_ORDER_ID
        );
        expect(result.reason).toBe("continued WAITING_FOR_ORDER_ID flow with retry");
    });

    test("clears the active state for complete outcomes", async () => {
        ConversationStateService.getConversationState.mockResolvedValue({
            state: CONVERSATION_STATES.WAITING_FOR_ORDER_ID
        });
        findFlowByState.mockReturnValue({
            id: "orderFlow"
        });
        resolveStateHandler.mockReturnValue(
            jest.fn().mockReturnValue({
                status: STATE_HANDLER_OUTCOMES.COMPLETE,
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
                nextState: null
            })
        );

        const result = await stateStrategy.execute(createContext("ORD-10001"));

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
        expect(result.reason).toBe("continued WAITING_FOR_ORDER_ID flow with complete");
    });

    test("clears the active state for fallback outcomes", async () => {
        ConversationStateService.getConversationState.mockResolvedValue({
            state: CONVERSATION_STATES.WAITING_FOR_ORDER_ID
        });
        findFlowByState.mockReturnValue({
            id: "orderFlow"
        });
        resolveStateHandler.mockReturnValue(
            jest.fn().mockReturnValue({
                status: STATE_HANDLER_OUTCOMES.FALLBACK,
                decision: {
                    action: "reply",
                    source: "rule_engine",
                    response: {
                        type: "text",
                        text: "I could not verify that order. Let me help another way."
                    },
                    nextState: null,
                    handoffRequired: false,
                    reason: "fallback from order flow",
                    confidence: 0.5
                },
                nextState: null
            })
        );

        const result = await stateStrategy.execute(createContext("ORD-UNKNOWN"));

        expect(result.decision.nextState).toBeNull();
        expect(result.reason).toBe("continued WAITING_FOR_ORDER_ID flow with fallback");
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

        expect(result).toMatchObject({
            handled: false,
            outcome: "CONTINUE",
            reason: "missing state handler for active state: WAITING_FOR_ORDER_ID"
        });
    });

    test("fails safely with a fallback decision when a state handler returns an invalid outcome", async () => {
        ConversationStateService.getConversationState.mockResolvedValue({
            state: CONVERSATION_STATES.WAITING_FOR_ORDER_ID
        });
        findFlowByState.mockReturnValue({
            id: "orderFlow"
        });
        resolveStateHandler.mockReturnValue(
            jest.fn().mockReturnValue({
                status: "broken",
                decision: null,
                nextState: null
            })
        );

        const result = await stateStrategy.execute(createContext("ORD-10001"));

        expect(result).toMatchObject({
            handled: true,
            outcome: "RESPOND",
            decision: {
                action: "reply",
                source: "rule_engine",
                response: {
                    type: "text",
                    text: "Thanks for reaching out! I will get back to you shortly if needed."
                },
                nextState: null,
                handoffRequired: false,
                reason: "fallback response",
                confidence: 0.6
            },
            reason: "state handler failure for active state: WAITING_FOR_ORDER_ID"
        });
    });
});
