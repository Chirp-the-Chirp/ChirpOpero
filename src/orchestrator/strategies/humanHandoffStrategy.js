"use strict";

const { notHandled } = require("../decisionFactory");

/**
 * Placeholder for routing conversations to a human agent.
 * @param {Object} context Orchestrator execution context.
 * @returns {Promise<Object>} Strategy result.
 */
async function humanHandoffStrategy(context) {
    void context;
    return notHandled();
}

module.exports = humanHandoffStrategy;
