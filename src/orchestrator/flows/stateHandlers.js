"use strict";

const { createReplyDecision } = require("../decisionFactory");
const { createHandledResult } = require("../contracts/strategyResultContract");

/**
 * Flow state handlers contain the actual continuation logic referenced by the registry.
 * The registry points to handler names, while this module owns the executable code.
 */

/**
 * Continue the order flow once the user is expected to provide an order ID.
 * @param {Object} context Normalized orchestrator context.
 * @returns {Object} Strategy result.
 */
function handleWaitingForOrderId(context) {
    void context;

    return createHandledResult(
        createReplyDecision(
            "Checking your order...",
            "handled WAITING_FOR_ORDER_ID state",
            0.95,
            null
        ),
        "continued WAITING_FOR_ORDER_ID flow"
    );
}

module.exports = {
    handleWaitingForOrderId
};
