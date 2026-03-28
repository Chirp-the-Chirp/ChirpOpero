"use strict";

const { createStrategy } = require("../contracts/strategyContract");
const { createNotHandledResult } = require("../contracts/strategyResultContract");

/**
 * Placeholder for validating whether a candidate response must use an approved template.
 * @param {Object} context Normalized orchestrator context.
 * @returns {Promise<Object>} Strategy result.
 */
async function execute(context) {
    void context;
    return createNotHandledResult("template policy evaluator not implemented");
}

module.exports = createStrategy("templatePolicyEvaluator", execute);
