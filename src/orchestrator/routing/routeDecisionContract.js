"use strict";

/**
 * Route decisions are produced by the routing engine and consumed by the
 * orchestrator. The routing engine only decides what should run next; it never
 * executes strategies itself.
 */

const ROUTE_ACTIONS = Object.freeze({
    RUN_STRATEGY: "run_strategy",
    FALLBACK: "fallback",
    END: "end"
});

/**
 * @typedef {Object} RouteDecision
 * @property {"run_strategy"|"fallback"|"end"} action
 * @property {string|null} nextStrategy
 * @property {string} reason
 * @property {Object} metadata
 */

/**
 * Create a route that asks the orchestrator to execute a strategy.
 * @param {string} nextStrategy Strategy identifier to execute.
 * @param {string} reason Human-readable routing explanation.
 * @param {Object} [metadata={}] Optional route metadata.
 * @returns {RouteDecision} Route decision.
 */
function createStrategyRoute(nextStrategy, reason, metadata = {}) {
    return assertValidRouteDecision({
        action: ROUTE_ACTIONS.RUN_STRATEGY,
        nextStrategy,
        reason,
        metadata: {
            ...metadata,
            selectedStrategy: nextStrategy
        }
    });
}

/**
 * Create a route that asks the orchestrator to use the safe fallback decision.
 * @param {string} reason Human-readable routing explanation.
 * @param {Object} [metadata={}] Optional route metadata.
 * @returns {RouteDecision} Route decision.
 */
function createFallbackRoute(reason, metadata = {}) {
    return assertValidRouteDecision({
        action: ROUTE_ACTIONS.FALLBACK,
        nextStrategy: null,
        reason,
        metadata: {
            ...metadata,
            fallbackReason: metadata.fallbackReason || reason
        }
    });
}

/**
 * Create a route that ends routing without selecting another strategy.
 * @param {string} reason Human-readable routing explanation.
 * @param {Object} [metadata={}] Optional route metadata.
 * @returns {RouteDecision} Route decision.
 */
function createEndRoute(reason, metadata = {}) {
    return assertValidRouteDecision({
        action: ROUTE_ACTIONS.END,
        nextStrategy: null,
        reason,
        metadata
    });
}

/**
 * Validate the route decision contract.
 * @param {RouteDecision} route Route decision to validate.
 * @returns {{ valid: boolean, reason?: string }} Validation result.
 */
function validateRouteDecision(route) {
    if (!route || typeof route !== "object") {
        return { valid: false, reason: "route decision must be an object" };
    }

    if (!Object.values(ROUTE_ACTIONS).includes(route.action)) {
        return { valid: false, reason: "route decision action is invalid" };
    }

    if (typeof route.reason !== "string" || route.reason.trim() === "") {
        return { valid: false, reason: "route decision reason is required" };
    }

    if (!route.metadata || typeof route.metadata !== "object") {
        return { valid: false, reason: "route decision metadata must be an object" };
    }

    if (route.action === ROUTE_ACTIONS.RUN_STRATEGY) {
        if (
            typeof route.nextStrategy !== "string" ||
            route.nextStrategy.trim() === ""
        ) {
            return { valid: false, reason: "route decision strategy is invalid" };
        }
    }

    if (route.action !== ROUTE_ACTIONS.RUN_STRATEGY && route.nextStrategy !== null) {
        return {
            valid: false,
            reason: "non-strategy route decisions must not set nextStrategy"
        };
    }

    return { valid: true };
}

/**
 * Throw when a route decision is invalid.
 * @param {RouteDecision} route Route decision to validate.
 * @returns {RouteDecision} Valid route decision.
 */
function assertValidRouteDecision(route) {
    const validation = validateRouteDecision(route);

    if (!validation.valid) {
        throw new Error(validation.reason);
    }

    return route;
}

module.exports = {
    ROUTE_ACTIONS,
    createStrategyRoute,
    createFallbackRoute,
    createEndRoute,
    validateRouteDecision,
    assertValidRouteDecision
};
