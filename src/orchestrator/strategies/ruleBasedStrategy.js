"use strict";

const { createReplyDecision } = require("../decisionFactory");
const { createStrategy } = require("../contracts/strategyContract");
const {
    createHandledResult,
    createNotHandledResult
} = require("../contracts/strategyResultContract");
const { matchFlowByTrigger } = require("../flows/flowRegistry.helpers");
const { matchRuleByTrigger } = require("../rules/ruleRegistry.helpers");
const { createLogger } = require("../../utils/logger");

const logger = createLogger("RuleBasedStrategy");

/**
 * Build a flow-start decision from a registry entry so triggers and entry states
 * stay centralized in the shared flow registry.
 * @param {Object} flow Flow definition from the shared registry.
 * @returns {Object} Handled strategy result.
 */
function createFlowStartResult(flow) {
    return createHandledResult(
        createReplyDecision(
            flow.entry.response.text,
            `started ${flow.id}`,
            0.9,
            flow.entry.state
        ),
        `matched flow trigger for ${flow.id}`
    );
}

/**
 * Build a one-shot reply decision from the shared static rule registry.
 * @param {Object} rule Static rule definition.
 * @returns {Object} Handled strategy result.
 */
function createStaticRuleResult(rule) {
    return createHandledResult(
        createReplyDecision(
            rule.response.text,
            `matched ${rule.id}`,
            0.85
        ),
        `matched static rule ${rule.id}`
    );
}

/**
 * Resolve deterministic flow starts and one-shot keyword rules before more
 * expensive strategies run.
 * @param {Object} context Normalized orchestrator context.
 * @returns {Promise<Object>} Strategy result.
 */
async function execute(context) {
    const text = context.message.text || "";
    const normalizedText = text.trim().toLowerCase();

    if (!normalizedText) {
        logger.debug("Skipping rule-based evaluation for empty text");
        return createNotHandledResult("rule-based strategy skipped empty text");
    }

    const matchedFlow = matchFlowByTrigger(normalizedText);

    if (matchedFlow) {
        if (
            matchedFlow.entry?.response?.type !== "text" ||
            typeof matchedFlow.entry?.response?.text !== "string" ||
            !matchedFlow.entry?.state
        ) {
            logger.warn("Matched flow has invalid entry configuration", {
                flowId: matchedFlow.id,
                text: normalizedText
            });
            return createNotHandledResult(
                `matched flow trigger has invalid entry config: ${matchedFlow.id}`
            );
        }

        logger.debug("Matched flow trigger in rule-based strategy", {
            flowId: matchedFlow.id,
            text: normalizedText
        });
        return createFlowStartResult(matchedFlow);
    }

    const matchedRule = matchRuleByTrigger(normalizedText);

    if (matchedRule) {
        if (
            matchedRule.response?.type !== "text" ||
            typeof matchedRule.response?.text !== "string"
        ) {
            logger.warn("Matched static rule has invalid response configuration", {
                ruleId: matchedRule.id,
                text: normalizedText
            });
            return createNotHandledResult(
                `matched static rule has invalid response config: ${matchedRule.id}`
            );
        }

        logger.debug("Matched static rule in rule-based strategy", {
            ruleId: matchedRule.id,
            text: normalizedText
        });
        return createStaticRuleResult(matchedRule);
    }

    logger.debug("No flow or static rule matched", {
        text: normalizedText
    });
    return createNotHandledResult("no rule-based match found");
}

module.exports = createStrategy("ruleBasedStrategy", execute);
