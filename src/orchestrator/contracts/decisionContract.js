"use strict";

const { ACTIONS, SOURCES } = require("../decisionTypes");

/**
 * Common decision contract shared by all strategies and the orchestrator.
 * Keeping decision rules in one place makes every strategy easier to reason
 * about and protects the controller from malformed responses.
 */

/**
 * @typedef {Object} DecisionResponse
 * @property {string} type
 * @property {string} text
 */

/**
 * @typedef {Object} OrchestratorDecision
 * @property {"reply"|"no_reply"|"handoff_to_human"|"send_template"|"error"} action
 * @property {string} source
 * @property {DecisionResponse|null} response
 * @property {string|null} nextState
 * @property {boolean} handoffRequired
 * @property {string} reason
 * @property {number} confidence
 */

/**
 * Validate the decision object returned from a strategy or the fallback path.
 * @param {OrchestratorDecision} decision Decision to validate.
 * @returns {{ valid: boolean, reason?: string }} Validation result.
 */
function validateDecision(decision) {
    if (!decision || typeof decision !== "object") {
        return { valid: false, reason: "decision must be an object" };
    }

    if (!Object.values(ACTIONS).includes(decision.action)) {
        return { valid: false, reason: "decision action is invalid" };
    }

    if (!Object.values(SOURCES).includes(decision.source)) {
        return { valid: false, reason: "decision source is invalid" };
    }

    if (typeof decision.reason !== "string" || decision.reason.trim() === "") {
        return { valid: false, reason: "decision reason is required" };
    }

    if (typeof decision.confidence !== "number" || Number.isNaN(decision.confidence)) {
        return { valid: false, reason: "decision confidence must be a number" };
    }

    if (typeof decision.handoffRequired !== "boolean") {
        return { valid: false, reason: "decision handoffRequired must be boolean" };
    }

    if (decision.action === ACTIONS.REPLY) {
        if (!decision.response || typeof decision.response !== "object") {
            return { valid: false, reason: "reply decision requires response" };
        }

        if (decision.response.type !== "text") {
            return { valid: false, reason: "reply response type must be text" };
        }

        if (
            typeof decision.response.text !== "string" ||
            decision.response.text.trim() === ""
        ) {
            return { valid: false, reason: "reply response text is required" };
        }
    }

    if (decision.action !== ACTIONS.REPLY && decision.response === undefined) {
        return { valid: false, reason: "decision response must be explicit" };
    }

    if (
        decision.action === ACTIONS.HANDOFF_TO_HUMAN &&
        decision.handoffRequired !== true
    ) {
        return {
            valid: false,
            reason: "handoff_to_human decisions must set handoffRequired to true"
        };
    }

    return { valid: true };
}

/**
 * Throw if a decision does not satisfy the shared decision contract.
 * @param {OrchestratorDecision} decision Decision to validate.
 * @returns {OrchestratorDecision} Validated decision.
 */
function assertValidDecision(decision) {
    const validation = validateDecision(decision);

    if (!validation.valid) {
        throw new Error(validation.reason);
    }

    return decision;
}

module.exports = {
    validateDecision,
    assertValidDecision
};
