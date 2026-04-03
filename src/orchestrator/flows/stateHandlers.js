"use strict";

const { createReplyDecision } = require("../decisionFactory");
const {
    createCompleteOutcome
} = require("../contracts/stateHandlerOutcomeContract");

/**
 * Flow state handlers contain the actual continuation logic referenced by the registry.
 * The registry points to handler names, while this module owns the executable code.
 * Each handler must return an explicit outcome so stateStrategy can safely decide
 * whether the flow should transition, retry, complete, or fall back.
 */

/**
 * Continue the order flow once the user is expected to provide an order ID.
 * @param {Object} context Normalized orchestrator context.
 * @returns {Object} Explicit state-handler outcome.
 */
function handleWaitingForOrderId(context) {
    void context;

    return createCompleteOutcome(
        createReplyDecision(
            "Checking your order...",
            "handled WAITING_FOR_ORDER_ID state",
            0.95
        )
    );
}

module.exports = {
    handleWaitingForOrderId
};
