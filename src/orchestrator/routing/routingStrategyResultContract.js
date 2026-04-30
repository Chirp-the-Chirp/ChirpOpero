"use strict";

const {
    STRATEGY_RESULT_OUTCOMES,
    assertValidStrategyResult
} = require("../contracts/strategyResultContract");
const { assertValidDecision } = require("../contracts/decisionContract");

/**
 * Routing-level strategy result.
 * Existing strategies still return the legacy `{ handled, decision }` contract.
 * The orchestrator adapts those results into these explicit routing outcomes so
 * later phases can support continue/fallback/end behavior without rewriting all
 * strategies at once.
 *
 * Outcome meanings:
 * - RESPOND: the strategy produced a final decision; the orchestrator returns it.
 * - CONTINUE: the strategy did not handle the message; the routing engine picks the next route.
 * - FALLBACK: the routing engine should choose the next safe fallback route.
 * - END: routing should stop without asking another strategy to run.
 */

const STRATEGY_OUTCOMES = Object.freeze({
    RESPOND: "RESPOND",
    CONTINUE: "CONTINUE",
    FALLBACK: "FALLBACK",
    END: "END"
});

/**
 * @typedef {Object} RoutingStrategyResult
 * @property {string} strategyId
 * @property {"RESPOND"|"CONTINUE"|"FALLBACK"|"END"} outcome
 * @property {Object|null} decision
 * @property {string} reason
 * @property {Object} metadata
 */

/**
 * Create a routing-level strategy result.
 * @param {string} strategyId Strategy that produced the result.
 * @param {"RESPOND"|"CONTINUE"|"FALLBACK"|"END"} outcome Routing outcome.
 * @param {Object} [options={}] Result options.
 * @returns {RoutingStrategyResult} Routing strategy result.
 */
function createRoutingStrategyResult(strategyId, outcome, options = {}) {
    const responseSource =
        options.responseSource ||
        options.decision?.source ||
        options.metadata?.responseSource ||
        null;
    const fallbackReason =
        outcome === STRATEGY_OUTCOMES.FALLBACK
            ? options.fallbackReason || options.reason || null
            : options.fallbackReason || null;

    return assertValidRoutingStrategyResult({
        strategyId,
        outcome,
        decision: options.decision || null,
        reason: options.reason || "strategy completed",
        metadata: {
            selectedStrategy: strategyId,
            previousStrategy:
                options.previousStrategy !== undefined
                    ? options.previousStrategy
                    : null,
            hopCount:
                options.hopCount !== undefined ? options.hopCount : null,
            responseSource,
            fallbackReason,
            ...(options.metadata || {})
        }
    });
}

/**
 * Adapt an existing strategy result into the new routing result shape.
 * @param {string} strategyId Strategy that produced the result.
 * @param {Object} result Existing strategy result.
 * @returns {RoutingStrategyResult} Routing-level result.
 */
function adaptStrategyResult(strategyId, result, options = {}) {
    const validatedResult = assertValidStrategyResult(result);

    if (
        validatedResult.handled ||
        validatedResult.outcome === STRATEGY_RESULT_OUTCOMES.RESPOND
    ) {
        return createRoutingStrategyResult(strategyId, STRATEGY_OUTCOMES.RESPOND, {
            decision: validatedResult.decision,
            reason: validatedResult.reason || validatedResult.decision.reason,
            previousStrategy: options.previousStrategy,
            hopCount: options.hopCount,
            responseSource: validatedResult.decision?.source || null,
            metadata: validatedResult.metadata || {}
        });
    }

    if (validatedResult.outcome === STRATEGY_RESULT_OUTCOMES.FALLBACK) {
        return createRoutingStrategyResult(strategyId, STRATEGY_OUTCOMES.FALLBACK, {
            reason: validatedResult.reason || "strategy requested fallback",
            previousStrategy: options.previousStrategy,
            hopCount: options.hopCount,
            fallbackReason: validatedResult.reason || "strategy requested fallback",
            metadata: validatedResult.metadata || {}
        });
    }

    if (validatedResult.outcome === STRATEGY_RESULT_OUTCOMES.END) {
        return createRoutingStrategyResult(strategyId, STRATEGY_OUTCOMES.END, {
            reason: validatedResult.reason || "strategy ended routing",
            previousStrategy: options.previousStrategy,
            hopCount: options.hopCount,
            metadata: validatedResult.metadata || {}
        });
    }

    return createRoutingStrategyResult(strategyId, STRATEGY_OUTCOMES.CONTINUE, {
        reason: validatedResult.reason || "strategy did not handle the request",
        previousStrategy: options.previousStrategy,
        hopCount: options.hopCount,
        metadata: validatedResult.metadata || {}
    });
}

/**
 * Validate a routing-level strategy result.
 * @param {RoutingStrategyResult} result Result to validate.
 * @returns {{ valid: boolean, reason?: string }} Validation result.
 */
function validateRoutingStrategyResult(result) {
    if (!result || typeof result !== "object") {
        return { valid: false, reason: "routing strategy result must be an object" };
    }

    if (typeof result.strategyId !== "string" || result.strategyId.trim() === "") {
        return { valid: false, reason: "routing strategy result strategyId is invalid" };
    }

    if (!Object.values(STRATEGY_OUTCOMES).includes(result.outcome)) {
        return { valid: false, reason: "routing strategy result outcome is invalid" };
    }

    if (typeof result.reason !== "string" || result.reason.trim() === "") {
        return { valid: false, reason: "routing strategy result reason is required" };
    }

    if (!result.metadata || typeof result.metadata !== "object") {
        return {
            valid: false,
            reason: "routing strategy result metadata must be an object"
        };
    }

    if (result.outcome === STRATEGY_OUTCOMES.RESPOND) {
        if (!result.decision) {
            return {
                valid: false,
                reason: "respond routing result requires decision"
            };
        }

        try {
            assertValidDecision(result.decision);
        } catch (error) {
            return { valid: false, reason: error.message };
        }
    }

    if (result.outcome !== STRATEGY_OUTCOMES.RESPOND && result.decision !== null) {
        return {
            valid: false,
            reason: "non-respond routing results must not set decision"
        };
    }

    return { valid: true };
}

/**
 * Throw when a routing-level strategy result is invalid.
 * @param {RoutingStrategyResult} result Result to validate.
 * @returns {RoutingStrategyResult} Valid routing strategy result.
 */
function assertValidRoutingStrategyResult(result) {
    const validation = validateRoutingStrategyResult(result);

    if (!validation.valid) {
        throw new Error(validation.reason);
    }

    return result;
}

module.exports = {
    STRATEGY_OUTCOMES,
    createRoutingStrategyResult,
    adaptStrategyResult,
    validateRoutingStrategyResult,
    assertValidRoutingStrategyResult
};
