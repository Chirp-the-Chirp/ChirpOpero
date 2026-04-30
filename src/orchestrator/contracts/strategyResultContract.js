"use strict";

const { assertValidDecision } = require("./decisionContract");

/**
 * Common strategy result contract.
 * Every strategy must either stop the pipeline with a handled decision or
 * explicitly return not handled so the next strategy can run.
 */

/**
 * @typedef {Object} StrategyResult
 * @property {boolean} handled
 * @property {Object} [decision]
 * @property {"RESPOND"|"CONTINUE"|"FALLBACK"|"END"} [outcome]
 * @property {Object|string|null} [response]
 * @property {string|null} [nextState]
 * @property {Object} [metadata]
 * @property {string} [reason]
 */

const STRATEGY_RESULT_OUTCOMES = Object.freeze({
    RESPOND: "RESPOND",
    CONTINUE: "CONTINUE",
    FALLBACK: "FALLBACK",
    END: "END"
});

/**
 * Create a handled strategy result.
 * @param {Object} decision Valid orchestrator decision.
 * @param {string} [reason] Optional strategy-level explanation.
 * @returns {StrategyResult} Handled result.
 */
function createHandledResult(decision, reason) {
    const validDecision = assertValidDecision(decision);

    return {
        handled: true,
        decision: validDecision,
        outcome: STRATEGY_RESULT_OUTCOMES.RESPOND,
        response: validDecision.response,
        nextState: validDecision.nextState,
        metadata: {
            responseSource: validDecision.source
        },
        reason: reason || validDecision.reason
    };
}

/**
 * Create a not-handled strategy result.
 * @param {string} [reason] Optional explanation for observability.
 * @returns {StrategyResult} Not-handled result.
 */
function createNotHandledResult(reason) {
    return {
        handled: false,
        outcome: STRATEGY_RESULT_OUTCOMES.CONTINUE,
        response: null,
        nextState: null,
        metadata: {
            responseSource: null
        },
        reason: reason || "strategy did not handle the request"
    };
}

/**
 * Create an explicit fallback strategy result.
 * @param {string} reason Fallback explanation.
 * @param {Object} [metadata={}] Optional fallback metadata.
 * @returns {StrategyResult} Fallback result.
 */
function createFallbackResult(reason, metadata = {}) {
    return {
        handled: false,
        outcome: STRATEGY_RESULT_OUTCOMES.FALLBACK,
        response: null,
        nextState: null,
        metadata,
        reason: reason || "strategy requested fallback"
    };
}

/**
 * Create an explicit end strategy result.
 * @param {string} reason End explanation.
 * @param {Object} [metadata={}] Optional end metadata.
 * @returns {StrategyResult} End result.
 */
function createEndResult(reason, metadata = {}) {
    return {
        handled: false,
        outcome: STRATEGY_RESULT_OUTCOMES.END,
        response: null,
        nextState: null,
        metadata,
        reason: reason || "strategy ended routing"
    };
}

/**
 * Validate a strategy result returned by a pipeline step.
 * @param {StrategyResult} result Strategy result to validate.
 * @returns {{ valid: boolean, reason?: string }} Validation result.
 */
function validateStrategyResult(result) {
    if (!result || typeof result !== "object") {
        return { valid: false, reason: "strategy result must be an object" };
    }

    if (typeof result.handled !== "boolean") {
        if (!Object.values(STRATEGY_RESULT_OUTCOMES).includes(result.outcome)) {
            return {
                valid: false,
                reason: "strategy result requires handled boolean or valid outcome"
            };
        }
    }

    if (
        result.outcome !== undefined &&
        !Object.values(STRATEGY_RESULT_OUTCOMES).includes(result.outcome)
    ) {
        return { valid: false, reason: "strategy result outcome is invalid" };
    }

    if (
        result.metadata !== undefined &&
        (!result.metadata || typeof result.metadata !== "object")
    ) {
        return { valid: false, reason: "strategy result metadata must be an object" };
    }

    if (result.handled || result.outcome === STRATEGY_RESULT_OUTCOMES.RESPOND) {
        if (!result.decision) {
            return {
                valid: false,
                reason: "handled strategy result requires decision"
            };
        }

        try {
            assertValidDecision(result.decision);
        } catch (error) {
            return { valid: false, reason: error.message };
        }
    }

    return { valid: true };
}

/**
 * Throw if a strategy result does not satisfy the shared contract.
 * @param {StrategyResult} result Strategy result to validate.
 * @returns {StrategyResult} Validated strategy result.
 */
function assertValidStrategyResult(result) {
    const validation = validateStrategyResult(result);

    if (!validation.valid) {
        throw new Error(validation.reason);
    }

    return result;
}

module.exports = {
    STRATEGY_RESULT_OUTCOMES,
    createHandledResult,
    createNotHandledResult,
    createFallbackResult,
    createEndResult,
    validateStrategyResult,
    assertValidStrategyResult
};
