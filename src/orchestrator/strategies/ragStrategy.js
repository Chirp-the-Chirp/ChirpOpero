"use strict";

const { notHandled } = require("../decisionFactory");

/**
 * Placeholder for retrieval-augmented generation routing.
 * @param {Object} context Orchestrator execution context.
 * @returns {Promise<Object>} Strategy result.
 */
async function ragStrategy(context) {
    void context;
    return notHandled();
}

module.exports = ragStrategy;
