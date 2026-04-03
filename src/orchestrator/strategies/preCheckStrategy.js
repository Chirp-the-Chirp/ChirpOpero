"use strict";

const { createErrorDecision } = require("../decisionFactory");
const { createStrategy } = require("../contracts/strategyContract");
const {
    createHandledResult,
    createNotHandledResult
} = require("../contracts/strategyResultContract");

/**
 * Validate the minimum context fields required before any business strategy runs.
 * @param {Object} context Normalized orchestrator context.
 * @returns {Promise<Object>} Strategy result.
 */
async function execute(context) {
    const message = context.message;

    if (!message.from) {
        return createHandledResult(
            createErrorDecision("missing sender in message payload"),
            "message sender is required"
        );
    }

    if (!message.type) {
        return createHandledResult(
            createErrorDecision("missing message type in payload"),
            "message type is required"
        );
    }

    return createNotHandledResult("pre-checks passed");
}

module.exports = createStrategy("preCheckStrategy", execute);
