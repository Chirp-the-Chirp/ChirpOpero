"use strict";

const { createStrategy } = require("../contracts/strategyContract");
const { createNotHandledResult } = require("../contracts/strategyResultContract");

/**
 * Placeholder for escalation rules that route conversations to a human agent.
 * @param {Object} context Normalized orchestrator context.
 * @returns {Promise<Object>} Strategy result.
 */
async function execute(context) {
    void context;
    return createNotHandledResult("human handoff strategy not implemented");
}

module.exports = createStrategy("humanHandoffStrategy", execute);
