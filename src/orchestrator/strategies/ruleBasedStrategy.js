"use strict";

const { createReplyDecision } = require("../decisionFactory");
const { createStrategy } = require("../contracts/strategyContract");
const {
    createHandledResult,
    createNotHandledResult
} = require("../contracts/strategyResultContract");

const GREETING_PHRASES = new Set(["hi", "hello"]);

/**
 * Resolve deterministic greeting and help rules before more expensive strategies run.
 * @param {Object} context Normalized orchestrator context.
 * @returns {Promise<Object>} Strategy result.
 */
async function execute(context) {
    const text = context.message.text || "";
    const normalizedText = text.trim().toLowerCase();

    if (!normalizedText) {
        return createNotHandledResult("rule-based strategy skipped empty text");
    }

    if (GREETING_PHRASES.has(normalizedText)) {
        return createHandledResult(
            createReplyDecision(
                "Hey there! How can I help you today?",
                "matched greeting",
                0.9
            ),
            "matched greeting phrase"
        );
    }

    if (normalizedText === "help") {
        return createHandledResult(
            createReplyDecision(
                "Sure, I can help! Tell me what you need and I will try to guide you.",
                "matched help request",
                0.85
            ),
            "matched help phrase"
        );
    }

    return createNotHandledResult("no rule-based match found");
}

module.exports = createStrategy("ruleBasedStrategy", execute);
