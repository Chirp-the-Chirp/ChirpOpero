"use strict";

const { notHandled } = require("../decisionFactory");

/**
 * Placeholder for FAQ lookup logic.
 * @param {Object} context Orchestrator execution context.
 * @returns {Promise<Object>} Strategy result.
 */
async function faqStrategy(context) {
    void context;
    return notHandled();
}

module.exports = faqStrategy;
