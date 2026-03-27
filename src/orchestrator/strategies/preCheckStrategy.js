"use strict";

const { createErrorDecision, handled, notHandled } = require("../decisionFactory");

/**
 * Validate the minimum orchestrator input required to continue the pipeline.
 * @param {Object} context Orchestrator execution context.
 * @returns {Promise<Object>} Strategy result.
 */
async function preCheckStrategy(context) {
    const message = context?.input?.message || {};

    if (!message.from) {
        return handled(createErrorDecision("missing sender in message payload"));
    }

    if (!message.type) {
        return handled(createErrorDecision("missing message type in payload"));
    }

    return notHandled();
}

module.exports = preCheckStrategy;
