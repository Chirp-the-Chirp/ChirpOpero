"use strict";

const { createReplyDecision, handled, notHandled } = require("../decisionFactory");

const GREETING_PHRASES = new Set(["hi", "hello"]);

/**
 * Resolve deterministic rules such as greetings and direct help requests.
 * @param {Object} context Orchestrator execution context.
 * @returns {Promise<Object>} Strategy result.
 */
async function ruleBasedStrategy(context) {
    const text = context?.input?.message?.text || "";
    const normalizedText = text.trim().toLowerCase();

    if (!normalizedText) {
        return notHandled();
    }

    if (GREETING_PHRASES.has(normalizedText)) {
        return handled(
            createReplyDecision(
                "Hey there! How can I help you today?",
                "matched greeting",
                0.9
            )
        );
    }

    if (normalizedText === "help") {
        return handled(
            createReplyDecision(
                "Sure, I can help! Tell me what you need and I will try to guide you.",
                "matched help request",
                0.85
            )
        );
    }

    return notHandled();
}

module.exports = ruleBasedStrategy;
