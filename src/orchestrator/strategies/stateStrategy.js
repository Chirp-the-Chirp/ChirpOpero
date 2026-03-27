"use strict";

const { notHandled } = require("../decisionFactory");

/**
 * Inspect active conversation state before content-based strategies run.
 * @param {Object} context Orchestrator execution context.
 * @returns {Promise<Object>} Strategy result.
 */
async function stateStrategy(context) {
    void context;
    return notHandled();
}

module.exports = stateStrategy;
