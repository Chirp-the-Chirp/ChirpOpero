"use strict";

const { ACTIONS, SOURCES } = require("./decisionTypes");
const { createLogger } = require("../utils/logger");

const logger = createLogger("ConversationOrchestrator");

const GREETING_PHRASES = new Set(["hi", "hello"]);

/**
 * Normalize orchestrator input so the rule engine can safely evaluate it.
 * @param {Object} [input={}] Raw orchestrator input payload.
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
 * Build a standard reply decision for the current rule-based orchestrator.
 * @param {string} text Reply text to return.
 * @param {string} reason Human-readable explanation for logging/debugging.
 * @param {number} confidence Confidence score for the selected route.
 * @returns {Object} Structured decision payload.
 */
function buildDecision(text, reason, confidence) {
    return {
        action: ACTIONS.REPLY,
        source: SOURCES.RULE_ENGINE,
        response: {
            type: "text",
            text
        },
        nextState: null,
        handoffRequired: false,
        reason,
        confidence
    };
}

/**
 * Decide how the system should respond based on simple rule-based routing.
 * @param {Object} input Orchestrator input payload.
 * @returns {Promise<Object>} Structured routing decision.
 */
async function orchestrate(input) {
    const normalized = normalizeInput(input);
    const payload = normalized.message;
    const trimmedText = payload.text.trim();
    const normalizedText = trimmedText.toLowerCase();

    let decision;

    if (GREETING_PHRASES.has(normalizedText)) {
        decision = buildDecision(
            "Hey there! How can I help you today?",
            "matched greeting",
            0.9
        );
    } else if (normalizedText === "help") {
        decision = buildDecision(
            "Sure, I can help! Tell me what you need and I will try to guide you.",
            "matched help request",
            0.85
        );
    } else {
        // Always return a safe fallback so downstream execution stays deterministic.
        decision = buildDecision(
            "Thanks for reaching out! I will get back to you shortly if needed.",
            "fallback response",
            0.6
        );
    }

    logger.debug("Orchestrator output", {
        messageId: payload.messageId,
        text: trimmedText,
        decision
    });

    return decision;
}

module.exports = {
    orchestrate
};
