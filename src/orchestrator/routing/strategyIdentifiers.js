"use strict";

/**
 * Central strategy identifiers used by the routing engine.
 * Keeping route names here prevents the routing layer from depending on file
 * paths or duplicated string literals.
 */
const STRATEGY_IDS = Object.freeze({
    PRE_CHECK: "preCheckStrategy",
    STATE: "stateStrategy",
    RULE_BASED: "ruleBasedStrategy",
    FAQ: "faqStrategy",
    RAG: "ragStrategy",
    LLM: "llmStrategy",
    TEMPLATE_POLICY: "templatePolicyEvaluator",
    HUMAN_HANDOFF: "humanHandoffStrategy"
});

/**
 * Check whether a value is one of the known strategy identifiers.
 * @param {string} strategyId Candidate strategy identifier.
 * @returns {boolean} True when the strategy id is supported.
 */
function isKnownStrategyId(strategyId) {
    return Object.values(STRATEGY_IDS).includes(strategyId);
}

module.exports = {
    STRATEGY_IDS,
    isKnownStrategyId
};
