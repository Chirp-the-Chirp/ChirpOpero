"use strict";

const { STRATEGY_IDS } = require("./strategyIdentifiers");
const { createStrategyRegistry } = require("./strategyRegistry");
const preCheckStrategy = require("../strategies/preCheckStrategy");
const stateStrategy = require("../strategies/stateStrategy");
const ruleBasedStrategy = require("../strategies/ruleBasedStrategy");
const faqStrategy = require("../strategies/faqStrategy");
const ragStrategy = require("../strategies/ragStrategy");
const llmStrategy = require("../strategies/llmStrategy");
const humanHandoffStrategy = require("../strategies/humanHandoffStrategy");
const templatePolicyEvaluator = require("../policies/templatePolicyEvaluator");

function createDefaultStrategyRegistry() {
    return createStrategyRegistry([
        [STRATEGY_IDS.PRE_CHECK, preCheckStrategy],
        [STRATEGY_IDS.STATE, stateStrategy],
        [STRATEGY_IDS.RULE_BASED, ruleBasedStrategy],
        [STRATEGY_IDS.FAQ, faqStrategy],
        [STRATEGY_IDS.RAG, ragStrategy],
        [STRATEGY_IDS.LLM, llmStrategy],
        [STRATEGY_IDS.TEMPLATE_POLICY, templatePolicyEvaluator],
        [STRATEGY_IDS.HUMAN_HANDOFF, humanHandoffStrategy]
    ]);
}

module.exports = createDefaultStrategyRegistry();
module.exports.createDefaultStrategyRegistry = createDefaultStrategyRegistry;
