"use strict";

const { createStrategy } = require("../contracts/strategyContract");
const { createNotHandledResult } = require("../contracts/strategyResultContract");

/**
 * Placeholder for model-generated responses after deterministic options are exhausted.
 * @param {Object} context Normalized orchestrator context.
 * @returns {Promise<Object>} Strategy result.
 */
async function execute(context) {
    void context;
    return createNotHandledResult("llm strategy not implemented");
}

module.exports = createStrategy("llmStrategy", execute);
