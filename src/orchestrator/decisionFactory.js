"use strict";

const { ACTIONS, SOURCES } = require("./decisionTypes");
const { assertValidDecision } = require("./contracts/decisionContract");

/**
 * Decision factory helpers centralize valid decision creation so strategies
 * can stay focused on routing logic instead of object-shape bookkeeping.
 */

/**
 * Build the standard reply decision shape used by orchestrator strategies.
 * @param {string} text Reply text to send to the customer.
 * @param {string} reason Human-readable explanation for the decision.
 * @param {number} confidence Confidence score for the decision.
 * @param {string|null} [nextState=null] Optional next conversation state.
 * @param {string} [source=SOURCES.RULE_ENGINE] Logical source of the decision.
 * @returns {Object} Reply decision payload.
 */
function createReplyDecision(
    text,
    reason,
    confidence,
    nextState = null,
    source = SOURCES.RULE_ENGINE
) {
    return assertValidDecision({
        action: ACTIONS.REPLY,
        source,
        response: {
            type: "text",
            text
        },
        nextState,
        handoffRequired: false,
        reason,
        confidence
    });
}

/**
 * Build an error decision when orchestration cannot continue safely.
 * @param {string} reason Human-readable explanation for the error.
 * @param {number} [confidence=1] Confidence score for the error decision.
 * @returns {Object} Error decision payload.
 */
function createErrorDecision(reason, confidence = 1) {
    return assertValidDecision({
        action: ACTIONS.ERROR,
        source: SOURCES.RULE_ENGINE,
        response: null,
        nextState: null,
        handoffRequired: false,
        reason,
        confidence
    });
}

/**
 * Build the deterministic fallback reply used when no strategy handles the message.
 * @returns {Object} Reply decision payload.
 */
function createFallbackDecision() {
    return createReplyDecision(
        "Thanks for reaching out! I will get back to you shortly if needed.",
        "fallback response",
        0.6
    );
}

module.exports = {
    createReplyDecision,
    createErrorDecision,
    createFallbackDecision
};
