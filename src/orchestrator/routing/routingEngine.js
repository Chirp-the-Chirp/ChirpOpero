"use strict";

const { createLogger } = require("../../utils/logger");
const { createFallbackRoute } = require("./routeDecisionContract");
const {
    validateRoutingContext
} = require("./routingContextContract");
const {
    DEFAULT_FALLBACK_CHAIN,
    createDefaultRoutingRules,
    selectRouteFromRules
} = require("./routingRules");

const logger = createLogger("RoutingEngine");
const DEFAULT_MAX_ROUTING_HOPS = 8;

/**
 * Routing engine for the strategy chain. The orchestrator executes strategies,
 * but this class owns which strategy should run next.
 */
class RoutingEngine {
    constructor(options = {}) {
        this.maxRoutingHops = options.maxRoutingHops || DEFAULT_MAX_ROUTING_HOPS;
        this.routingRules =
            options.routingRules ||
            createDefaultRoutingRules({
                fallbackChain: options.fallbackChain || DEFAULT_FALLBACK_CHAIN
            });
    }

    /**
     * Decide which strategy the orchestrator should run next.
     * @param {Object} context Routing context.
     * @returns {Object} Route decision.
     */
    getNextRoute(context) {
        const validation = validateRoutingContext(context);

        if (!validation.valid) {
            logger.warn("Invalid routing context, using fallback route", {
                reason: validation.reason
            });
            return createFallbackRoute(validation.reason);
        }

        if (context.hopCount >= this.maxRoutingHops) {
            logger.warn("Routing hop limit reached", {
                hopCount: context.hopCount,
                maxRoutingHops: this.maxRoutingHops
            });
            return createFallbackRoute("routing hop limit reached", {
                hopCount: context.hopCount,
                maxRoutingHops: this.maxRoutingHops
            });
        }

        if (!context.previousResult) {
            return this.#selectRoute(this.routingRules.initial, context);
        }

        return this.#selectRoute(this.routingRules.followUp, context);
    }

    /**
     * Select a route from the matching routing rule set.
     * @param {Array<Object>} rules Routing rules to evaluate.
     * @param {Object} context Routing context.
     * @returns {Object} Route decision.
     */
    #selectRoute(rules, context) {
        const route = selectRouteFromRules(rules, context);

        logger.debug("Routing rule selected route", {
            customerId: context.customer?.customerId || null,
            hopCount: context.hopCount,
            previousStrategy: context.previousStrategy || null,
            selectedStrategy: route.metadata?.selectedStrategy || route.nextStrategy || null,
            routeAction: route.action,
            ruleName: route.metadata?.ruleName || null,
            fallbackReason: route.metadata?.fallbackReason || null
        });

        return route || createFallbackRoute("no routing rule matched");
    }
}

module.exports = new RoutingEngine();
module.exports.RoutingEngine = RoutingEngine;
module.exports.DEFAULT_MAX_ROUTING_HOPS = DEFAULT_MAX_ROUTING_HOPS;
module.exports.DEFAULT_FALLBACK_CHAIN = DEFAULT_FALLBACK_CHAIN;
