"use strict";

const { notHandled } = require("../decisionFactory");

/**
 * Placeholder for LLM-backed response generation.
 * @param {Object} context Orchestrator execution context.
 * @returns {Promise<Object>} Strategy result.
 */
async function llmStrategy(context) {
    void context;
    return notHandled();
}

module.exports = llmStrategy;
