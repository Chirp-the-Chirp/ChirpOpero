"use strict";

const {
    handleWaitingForOrderId
} = require("../../../../src/orchestrator/flows/stateHandlers");
const {
    STATE_HANDLER_OUTCOMES,
    validateStateHandlerOutcome
} = require("../../../../src/orchestrator/contracts/stateHandlerOutcomeContract");

describe("stateHandlers", () => {
    // These tests ensure concrete handlers always return explicit continuation outcomes.

    function createContext() {
        return {
            message: {
                messageId: "wamid.text.001",
                from: "94770000001",
                type: "text",
                text: "ORD-10001",
                timestamp: "1774078799"
            },
            conversation: {
                state: "WAITING_FOR_ORDER_ID"
            },
            customer: {
                customerId: "94770000001"
            },
            metadata: {
                channel: "whatsapp"
            }
        };
    }

    test("WAITING_FOR_ORDER_ID returns a valid complete outcome", () => {
        const outcome = handleWaitingForOrderId(createContext());

        expect(validateStateHandlerOutcome(outcome)).toEqual({ valid: true });
        expect(outcome).toEqual({
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
        });
    });
});
