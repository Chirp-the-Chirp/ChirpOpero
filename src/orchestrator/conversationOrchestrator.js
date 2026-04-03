"use strict";

const { createFallbackDecision, createErrorDecision } = require("./decisionFactory");
const {
    normalizeOrchestratorContext,
    validateOrchestratorContext
} = require("./contracts/orchestratorContext");
const {
    assertValidStrategyResult
} = require("./contracts/strategyResultContract");
const {
    assertValidStrategyModule
} = require("./contracts/strategyContract");
const preCheckStrategy = require("./strategies/preCheckStrategy");
const stateStrategy = require("./strategies/stateStrategy");
const ruleBasedStrategy = require("./strategies/ruleBasedStrategy");
const faqStrategy = require("./strategies/faqStrategy");
const ragStrategy = require("./strategies/ragStrategy");
const llmStrategy = require("./strategies/llmStrategy");
const humanHandoffStrategy = require("./strategies/humanHandoffStrategy");
const templatePolicyEvaluator = require("./policies/templatePolicyEvaluator");
const { createLogger } = require("../utils/logger");

const logger = createLogger("ConversationOrchestrator");

/**
 * The orchestrator owns the pipeline contract so future strategies can plug in
 * without changing the controller or other strategies.
 */

/**
 * Return the ordered strategy pipeline for deterministic-first orchestration.
 * @returns {Array<Object>} Ordered pipeline definition.
 */
function getStrategyPipeline() {
    return [
        preCheckStrategy,
        stateStrategy,
        ruleBasedStrategy,
        faqStrategy,
        ragStrategy,
        llmStrategy,
        templatePolicyEvaluator,
        humanHandoffStrategy
    ].map(assertValidStrategyModule);
}

/**
 * Run the configured strategies in order until one returns a handled result.
 * @param {Object} context Normalized orchestrator context.
 * @returns {Promise<Object|null>} First handled decision or null.
 */
async function runPipeline(context) {
    for (const strategy of getStrategyPipeline()) {
        logger.debug("Running orchestrator strategy", {
            strategy: strategy.name,
            messageId: context.message.messageId
        });

        const result = assertValidStrategyResult(await strategy.execute(context));

        logger.debug("Strategy completed", {
            strategy: strategy.name,
            messageId: context.message.messageId,
            handled: result.handled,
            reason: result.reason || null
        });

        if (result.handled) {
            logger.debug("Strategy handled request", {
                strategy: strategy.name,
                messageId: context.message.messageId,
                decision: result.decision
            });
            return result.decision;
        }
    }

    return null;
}

/**
 * Run the deterministic-first orchestration pipeline and return a decision.
 * @param {Object} input Orchestrator input payload.
 * @returns {Promise<Object>} Structured orchestrator decision.
 */
async function orchestrate(input) {
    const context = normalizeOrchestratorContext(input);
    const validation = validateOrchestratorContext(context);

    if (!validation.valid) {
        logger.error("Invalid orchestrator context", {
            reason: validation.reason,
            input
        });
        return createErrorDecision(validation.reason);
    }

    try {
        const decision = await runPipeline(context);

        if (decision) {
            return decision;
        }

        const fallbackDecision = createFallbackDecision();
        logger.debug("No strategy handled request, using fallback", {
            messageId: context.message.messageId,
            decision: fallbackDecision
        });

        return fallbackDecision;
    } catch (error) {
        logger.error("Orchestration pipeline failed", {
            messageId: context.message.messageId,
            error
        });

        return createErrorDecision("orchestration pipeline failed unexpectedly");
    }
}

module.exports = {
    orchestrate
};
