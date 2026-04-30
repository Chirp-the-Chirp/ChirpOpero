"use strict";

/**
 * Routing context is the small, stable object the routing engine reads to pick
 * the next strategy. It intentionally contains no Express or WhatsApp API
 * details, which keeps routing independent from transport concerns.
 */

/**
 * @typedef {Object} RoutingContext
 * @property {Object} message Normalized orchestrator message.
 * @property {Object} conversation Normalized conversation context.
 * @property {Object} customer Normalized customer context.
 * @property {Object} metadata Normalized metadata.
 * @property {Object|null} previousResult Previous routing strategy result.
 * @property {Array<string>} visitedStrategies Strategy ids already executed.
 * @property {Array<Object>} routeHistory Strategy routing history.
 * @property {string|null} selectedStrategy Most recently selected strategy.
 * @property {string|null} previousStrategy Previously executed strategy.
 * @property {string|null} fallbackReason Fallback reason from the previous hop.
 * @property {string|null} responseSource Previous response source when available.
 * @property {number} hopCount Current routing hop count.
 */

/**
 * Build a routing context from the normalized orchestrator context.
 * @param {Object} orchestratorContext Normalized orchestrator context.
 * @param {Object} [options={}] Routing loop state.
 * @returns {RoutingContext} Routing context.
 */
function createRoutingContext(orchestratorContext, options = {}) {
    return {
        message: orchestratorContext.message,
        conversation: orchestratorContext.conversation,
        customer: orchestratorContext.customer,
        metadata: orchestratorContext.metadata,
        previousResult: options.previousResult || null,
        visitedStrategies: Array.isArray(options.visitedStrategies)
            ? [...options.visitedStrategies]
            : [],
        routeHistory: Array.isArray(options.routeHistory)
            ? options.routeHistory.map((routeHistoryEntry) => ({
                ...routeHistoryEntry
            }))
            : [],
        selectedStrategy:
            typeof options.selectedStrategy === "string"
                ? options.selectedStrategy
                : null,
        previousStrategy:
            typeof options.previousStrategy === "string"
                ? options.previousStrategy
                : options.previousResult?.strategyId || null,
        fallbackReason:
            typeof options.fallbackReason === "string"
                ? options.fallbackReason
                : options.previousResult?.outcome === "FALLBACK"
                    ? options.previousResult.reason
                    : null,
        responseSource:
            typeof options.responseSource === "string"
                ? options.responseSource
                : options.previousResult?.metadata?.responseSource || null,
        hopCount: Number.isInteger(options.hopCount) ? options.hopCount : 0
    };
}

/**
 * Validate the routing context shape before a routing engine uses it.
 * @param {RoutingContext} context Routing context to validate.
 * @returns {{ valid: boolean, reason?: string }} Validation result.
 */
function validateRoutingContext(context) {
    if (!context || typeof context !== "object") {
        return { valid: false, reason: "routing context must be an object" };
    }

    if (!context.message || typeof context.message !== "object") {
        return { valid: false, reason: "routing context requires message" };
    }

    if (!context.conversation || typeof context.conversation !== "object") {
        return { valid: false, reason: "routing context requires conversation" };
    }

    if (!context.customer || typeof context.customer !== "object") {
        return { valid: false, reason: "routing context requires customer" };
    }

    if (!context.metadata || typeof context.metadata !== "object") {
        return { valid: false, reason: "routing context requires metadata" };
    }

    if (!Array.isArray(context.visitedStrategies)) {
        return {
            valid: false,
            reason: "routing context visitedStrategies must be an array"
        };
    }

    if (!Array.isArray(context.routeHistory)) {
        return {
            valid: false,
            reason: "routing context routeHistory must be an array"
        };
    }

    if (!Number.isInteger(context.hopCount) || context.hopCount < 0) {
        return { valid: false, reason: "routing context hopCount must be valid" };
    }

    if (
        context.selectedStrategy !== null &&
        (typeof context.selectedStrategy !== "string" ||
            context.selectedStrategy.trim() === "")
    ) {
        return {
            valid: false,
            reason: "routing context selectedStrategy must be a string or null"
        };
    }

    if (
        context.previousStrategy !== null &&
        (typeof context.previousStrategy !== "string" ||
            context.previousStrategy.trim() === "")
    ) {
        return {
            valid: false,
            reason: "routing context previousStrategy must be a string or null"
        };
    }

    if (
        context.fallbackReason !== null &&
        (typeof context.fallbackReason !== "string" ||
            context.fallbackReason.trim() === "")
    ) {
        return {
            valid: false,
            reason: "routing context fallbackReason must be a string or null"
        };
    }

    if (
        context.responseSource !== null &&
        (typeof context.responseSource !== "string" ||
            context.responseSource.trim() === "")
    ) {
        return {
            valid: false,
            reason: "routing context responseSource must be a string or null"
        };
    }

    if (
        context.previousResult !== null &&
        (typeof context.previousResult !== "object" || Array.isArray(context.previousResult))
    ) {
        return {
            valid: false,
            reason: "routing context previousResult must be an object or null"
        };
    }

    return { valid: true };
}

/**
 * Throw when a routing context is invalid.
 * @param {RoutingContext} context Routing context to validate.
 * @returns {RoutingContext} Valid routing context.
 */
function assertValidRoutingContext(context) {
    const validation = validateRoutingContext(context);

    if (!validation.valid) {
        throw new Error(validation.reason);
    }

    return context;
}

module.exports = {
    createRoutingContext,
    validateRoutingContext,
    assertValidRoutingContext
};
