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
 * @property {string} [reason]
 */

/**
 * Create a handled strategy result.
 * @param {Object} decision Valid orchestrator decision.
 * @param {string} [reason] Optional strategy-level explanation.
 * @returns {StrategyResult} Handled result.
 */
function createHandledResult(decision, reason) {
    return {
        handled: true,
        decision: assertValidDecision(decision),
        reason: reason || decision.reason
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
        reason: reason || "strategy did not handle the request"
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
        return { valid: false, reason: "strategy result requires handled boolean" };
    }

    if (result.handled) {
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
    createHandledResult,
    createNotHandledResult,
    validateStrategyResult,
    assertValidStrategyResult
};
