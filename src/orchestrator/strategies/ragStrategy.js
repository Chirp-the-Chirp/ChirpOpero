"use strict";

const { createStrategy } = require("../contracts/strategyContract");
const { createNotHandledResult } = require("../contracts/strategyResultContract");

/**
 * Placeholder for retrieval-augmented answering over indexed knowledge sources.
 * @param {Object} context Normalized orchestrator context.
 * @returns {Promise<Object>} Strategy result.
 */
async function execute(context) {
    void context;
    return createNotHandledResult("rag strategy not implemented");
}

module.exports = createStrategy("ragStrategy", execute);
