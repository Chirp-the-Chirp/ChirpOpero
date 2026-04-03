"use strict";

const {
    STATE_HANDLER_OUTCOMES,
    createCompleteOutcome,
    createRetryOutcome,
    createTransitionOutcome,
    validateStateHandlerOutcome
} = require("../../../../src/orchestrator/contracts/stateHandlerOutcomeContract");
const { createReplyDecision } = require("../../../../src/orchestrator/decisionFactory");
const {
    CONVERSATION_STATES
} = require("../../../../src/orchestrator/conversationStateTypes");

describe("stateHandlerOutcomeContract", () => {
    // These tests protect the explicit continuation outcomes used by state handlers.

    function createDecision(reason = "state handler reply") {
        return createReplyDecision("Checking your order...", reason, 0.95);
    }

    test("accepts a valid transition outcome", () => {
        const validation = validateStateHandlerOutcome(
            createTransitionOutcome(
                createDecision("transition decision"),
                CONVERSATION_STATES.WAITING_FOR_ORDER_ID
            )
        );

        expect(validation).toEqual({ valid: true });
    });

    test("accepts valid retry and complete outcomes", () => {
        expect(
            validateStateHandlerOutcome(createRetryOutcome(createDecision("retry")))
        ).toEqual({ valid: true });
        expect(
            validateStateHandlerOutcome(createCompleteOutcome(createDecision("complete")))
        ).toEqual({ valid: true });
    });

    test("rejects invalid statuses safely", () => {
        const validation = validateStateHandlerOutcome({
            status: "unknown",
            decision: createDecision("invalid"),
            nextState: null
        });

        expect(validation).toEqual({
            valid: false,
            reason: "state handler outcome status is invalid"
        });
    });

    test("rejects malformed objects without a decision", () => {
        const validation = validateStateHandlerOutcome({
            status: STATE_HANDLER_OUTCOMES.COMPLETE,
            nextState: null
        });

        expect(validation).toEqual({
            valid: false,
            reason: "state handler outcome requires decision"
        });
    });

    test("enforces nextState rules for each outcome type", () => {
        expect(
            validateStateHandlerOutcome({
                status: STATE_HANDLER_OUTCOMES.TRANSITION,
                decision: createDecision("missing transition state"),
                nextState: null
            })
        ).toEqual({
            valid: false,
            reason: "transition outcomes require nextState"
        });

        expect(
            validateStateHandlerOutcome({
                status: STATE_HANDLER_OUTCOMES.RETRY,
                decision: createDecision("retry with next state"),
                nextState: CONVERSATION_STATES.WAITING_FOR_ORDER_ID
            })
        ).toEqual({
            valid: false,
            reason: "retry outcomes must set nextState to null"
        });

        expect(
            validateStateHandlerOutcome({
                status: STATE_HANDLER_OUTCOMES.COMPLETE,
                decision: createDecision("complete with next state"),
                nextState: CONVERSATION_STATES.WAITING_FOR_ORDER_ID
            })
        ).toEqual({
            valid: false,
            reason: "complete outcomes must set nextState to null"
        });
    });
});
