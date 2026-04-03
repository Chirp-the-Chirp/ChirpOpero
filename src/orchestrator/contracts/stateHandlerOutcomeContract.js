"use strict";

const { assertValidDecision } = require("./decisionContract");

/**
 * State handler outcome contract.
 * State handlers must explicitly declare how the current flow should proceed so
 * continuation logic cannot silently forget to transition, retry, or terminate.
 * New handlers should always return one of the factory helpers exported here
 * instead of hand-building outcome objects inline.
 */

const STATE_HANDLER_OUTCOMES = Object.freeze({
    TRANSITION: "transition",
    RETRY: "retry",
    COMPLETE: "complete",
    FALLBACK: "fallback"
});

/**
 * @typedef {Object} StateHandlerOutcome
 * @property {"transition"|"retry"|"complete"|"fallback"} status
 * @property {Object} decision
 * @property {string|null} nextState
 */

/**
 * Validate that the outcome has the correct next-state semantics for its status.
 * @param {StateHandlerOutcome} outcome State handler outcome to validate.
 * @returns {{ valid: boolean, reason?: string }} Validation result.
 */
function validateNextStateRules(outcome) {
    if (
        outcome.status === STATE_HANDLER_OUTCOMES.TRANSITION &&
        outcome.nextState === null
    ) {
        return {
            valid: false,
            reason: "transition outcomes require nextState"
        };
    }

    if (outcome.status === STATE_HANDLER_OUTCOMES.RETRY && outcome.nextState !== null) {
        return {
            valid: false,
            reason: "retry outcomes must set nextState to null"
        };
    }

    if (
        (outcome.status === STATE_HANDLER_OUTCOMES.COMPLETE ||
            outcome.status === STATE_HANDLER_OUTCOMES.FALLBACK) &&
        outcome.nextState !== null
    ) {
        return {
            valid: false,
            reason: `${outcome.status} outcomes must set nextState to null`
        };
    }

    return { valid: true };
}

/**
 * Validate a state handler outcome before stateStrategy interprets it.
 * @param {StateHandlerOutcome} outcome State handler outcome to validate.
 * @returns {{ valid: boolean, reason?: string }} Validation result.
 */
function validateStateHandlerOutcome(outcome) {
    if (!outcome || typeof outcome !== "object") {
        return { valid: false, reason: "state handler outcome must be an object" };
    }

    if (!Object.values(STATE_HANDLER_OUTCOMES).includes(outcome.status)) {
        return { valid: false, reason: "state handler outcome status is invalid" };
    }

    if (!Object.prototype.hasOwnProperty.call(outcome, "decision")) {
        return {
            valid: false,
            reason: "state handler outcome requires decision"
        };
    }

    try {
        assertValidDecision(outcome.decision);
    } catch (error) {
        return { valid: false, reason: error.message };
    }

    if (!Object.prototype.hasOwnProperty.call(outcome, "nextState")) {
        return {
            valid: false,
            reason: "state handler outcome requires nextState"
        };
    }

    if (
        outcome.nextState !== null &&
        (typeof outcome.nextState !== "string" || outcome.nextState.trim() === "")
    ) {
        return {
            valid: false,
            reason: "state handler outcome nextState must be a non-empty string or null"
        };
    }

    const nextStateValidation = validateNextStateRules(outcome);
    if (!nextStateValidation.valid) {
        return nextStateValidation;
    }

    return { valid: true };
}

/**
 * Throw if a state handler outcome does not satisfy the shared contract.
 * @param {StateHandlerOutcome} outcome State handler outcome to validate.
 * @returns {StateHandlerOutcome} Validated outcome.
 */
function assertValidStateHandlerOutcome(outcome) {
    const validation = validateStateHandlerOutcome(outcome);

    if (!validation.valid) {
        throw new Error(validation.reason);
    }

    return outcome;
}

/**
 * Build a validated state-handler outcome.
 * @param {"transition"|"retry"|"complete"|"fallback"} status Outcome status.
 * @param {Object} decision Valid orchestrator decision.
 * @param {string|null} [nextState=null] Next state when transitioning.
 * @returns {StateHandlerOutcome} Validated outcome object.
 */
function createStateHandlerOutcome(status, decision, nextState = null) {
    return assertValidStateHandlerOutcome({
        status,
        decision: assertValidDecision(decision),
        nextState
    });
}

/**
 * Create an outcome that advances the flow to another state.
 * @param {Object} decision Valid orchestrator decision.
 * @param {string} nextState State to persist for the next turn.
 * @returns {StateHandlerOutcome} Transition outcome.
 */
function createTransitionOutcome(decision, nextState) {
    return createStateHandlerOutcome(
        STATE_HANDLER_OUTCOMES.TRANSITION,
        decision,
        nextState
    );
}

/**
 * Create an outcome that keeps the conversation in the current state.
 * @param {Object} decision Valid orchestrator decision.
 * @returns {StateHandlerOutcome} Retry outcome.
 */
function createRetryOutcome(decision) {
    return createStateHandlerOutcome(STATE_HANDLER_OUTCOMES.RETRY, decision, null);
}

/**
 * Create an outcome that completes the active flow and clears its state.
 * @param {Object} decision Valid orchestrator decision.
 * @returns {StateHandlerOutcome} Complete outcome.
 */
function createCompleteOutcome(decision) {
    return createStateHandlerOutcome(STATE_HANDLER_OUTCOMES.COMPLETE, decision, null);
}

/**
 * Create an outcome that exits the active flow and delegates to a fallback decision.
 * @param {Object} decision Valid orchestrator decision.
 * @returns {StateHandlerOutcome} Fallback outcome.
 */
function createFallbackOutcome(decision) {
    return createStateHandlerOutcome(STATE_HANDLER_OUTCOMES.FALLBACK, decision, null);
}

module.exports = {
    STATE_HANDLER_OUTCOMES,
    validateStateHandlerOutcome,
    assertValidStateHandlerOutcome,
    createStateHandlerOutcome,
    createTransitionOutcome,
    createRetryOutcome,
    createCompleteOutcome,
    createFallbackOutcome
};
