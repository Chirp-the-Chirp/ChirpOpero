"use strict";

/**
 * Common orchestrator context contract shared by every strategy.
 * New strategies should read only from this normalized shape instead of raw
 * controller payloads so the orchestration pipeline stays stable over time.
 */

/**
 * @typedef {Object} OrchestratorMessage
 * @property {string|null} messageId
 * @property {string|null} from
 * @property {string|null} type
 * @property {string} text
 * @property {string|null} timestamp
 */

/**
 * @typedef {Object} OrchestratorConversation
 * @property {string|null} state
 * @property {string|null} lastRoute
 * @property {string|null} lastHandledAt
 */

/**
 * @typedef {Object} OrchestratorCustomer
 * @property {string|null} customerId
 * @property {string|null} name
 */

/**
 * @typedef {Object} OrchestratorMetadata
 * @property {string} channel
 */

/**
 * @typedef {Object} OrchestratorContext
 * @property {OrchestratorMessage} message
 * @property {OrchestratorConversation} conversation
 * @property {OrchestratorCustomer} customer
 * @property {OrchestratorMetadata} metadata
 */

/**
 * Normalize raw orchestrator input into the strict context shape used by strategies.
 * @param {Object} [input={}] Raw orchestrator input.
 * @returns {OrchestratorContext} Normalized orchestrator context.
 */
function normalizeOrchestratorContext(input = {}) {
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
 * Validate the minimum context shape required by the pipeline.
 * @param {OrchestratorContext} context Orchestrator context to validate.
 * @returns {{ valid: boolean, reason?: string }} Validation result.
 */
function validateOrchestratorContext(context) {
    if (!context || typeof context !== "object") {
        return { valid: false, reason: "orchestrator context must be an object" };
    }

    if (!context.message || typeof context.message !== "object") {
        return { valid: false, reason: "orchestrator context requires message" };
    }

    if (!context.conversation || typeof context.conversation !== "object") {
        return {
            valid: false,
            reason: "orchestrator context requires conversation"
        };
    }

    if (!context.customer || typeof context.customer !== "object") {
        return { valid: false, reason: "orchestrator context requires customer" };
    }

    if (!context.metadata || typeof context.metadata !== "object") {
        return { valid: false, reason: "orchestrator context requires metadata" };
    }

    return { valid: true };
}

module.exports = {
    normalizeOrchestratorContext,
    validateOrchestratorContext
};
