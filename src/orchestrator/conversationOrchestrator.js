"use strict";

const { createFallbackDecision, createErrorDecision } = require("./decisionFactory");
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
 * Normalize orchestrator input so every strategy receives the same stable payload.
 * @param {Object} [input={}] Raw orchestrator input.
 * @returns {Object} Normalized orchestrator input.
 */
function normalizeInput(input = {}) {
    const message = input.message || {};
    const conversation = input.conversation || {};
    const customer = input.customer || {};
    const metadata = input.metadata || {};

    return {
        message: {
            messageId: message.messageId || null,
            from: message.from || null,
            type: message.type || null,
            text: typeof message.text === "string" ? message.text : "",
            timestamp: message.timestamp || null
        },
        conversation: {
            state: conversation.state || null,
            lastRoute: conversation.lastRoute || null,
            lastHandledAt: conversation.lastHandledAt || null
        },
        customer: {
            customerId: customer.customerId || null,
            name: customer.name || null
        },
        metadata: {
            channel: metadata.channel || "whatsapp"
        }
    };
}

/**
 * Create the mutable execution context shared across orchestrator strategies.
 * @param {Object} input Normalized orchestrator input.
 * @returns {Object} Orchestrator execution context.
 */
function createPipelineContext(input) {
    return {
        input
    };
}

/**
 * Return the ordered strategy pipeline for deterministic-first orchestration.
 * @returns {Array<Object>} Ordered pipeline definition.
 */
function getStrategyPipeline() {
    return [
        { name: "preCheckStrategy", execute: preCheckStrategy },
        { name: "stateStrategy", execute: stateStrategy },
        { name: "ruleBasedStrategy", execute: ruleBasedStrategy },
        { name: "faqStrategy", execute: faqStrategy },
        { name: "ragStrategy", execute: ragStrategy },
        { name: "llmStrategy", execute: llmStrategy },
        { name: "templatePolicyEvaluator", execute: templatePolicyEvaluator },
        { name: "humanHandoffStrategy", execute: humanHandoffStrategy }
    ];
}

/**
 * Run the configured strategies in order until one produces a handled decision.
 * @param {Object} context Orchestrator execution context.
 * @returns {Promise<Object|null>} First handled decision or null.
 */
async function runPipeline(context) {
    for (const strategy of getStrategyPipeline()) {
        logger.debug("Running orchestrator strategy", {
            strategy: strategy.name,
            messageId: context.input.message.messageId
        });

        const result = await strategy.execute(context);

        if (result && result.handled) {
            logger.debug("Strategy handled request", {
                strategy: strategy.name,
                messageId: context.input.message.messageId,
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
    const normalizedInput = normalizeInput(input);
    const context = createPipelineContext(normalizedInput);

    try {
        const decision = await runPipeline(context);

        if (decision) {
            return decision;
        }

        const fallbackDecision = createFallbackDecision();
        logger.debug("No strategy handled request, using fallback", {
            messageId: normalizedInput.message.messageId,
            decision: fallbackDecision
        });

        return fallbackDecision;
    } catch (error) {
        logger.error("Orchestration pipeline failed", {
            messageId: normalizedInput.message.messageId,
            error
        });

        return createErrorDecision("orchestration pipeline failed unexpectedly");
    }
}

module.exports = {
    orchestrate
};
