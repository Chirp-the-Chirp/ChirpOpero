"use strict";

const { createStrategy } = require("../contracts/strategyContract");
const { createNotHandledResult } = require("../contracts/strategyResultContract");

/**
 * Placeholder for FAQ matching against curated question/answer content.
 * @param {Object} context Normalized orchestrator context.
 * @returns {Promise<Object>} Strategy result.
 */
async function execute(context) {
    void context;
    return createNotHandledResult("faq strategy not implemented");
}

module.exports = createStrategy("faqStrategy", execute);
