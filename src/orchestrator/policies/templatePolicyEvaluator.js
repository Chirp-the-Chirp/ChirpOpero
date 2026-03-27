"use strict";

const { notHandled } = require("../decisionFactory");

/**
 * Placeholder for template policy checks before any template-based response is sent.
 * @param {Object} context Orchestrator execution context.
 * @returns {Promise<Object>} Strategy result.
 */
async function templatePolicyEvaluator(context) {
    void context;
    return notHandled();
}

module.exports = templatePolicyEvaluator;
