"use strict";

const { createLogger } = require("../../utils/logger");
const { STRATEGY_IDS } = require("./strategyIdentifiers");
const {
    STRATEGY_OUTCOMES
} = require("./routingStrategyResultContract");
const {
    createStrategyRoute,
    createFallbackRoute,
    createEndRoute
} = require("./routeDecisionContract");
const {
    validateRoutingContext
} = require("./routingContextContract");

const logger = createLogger("RoutingEngine");
const DEFAULT_MAX_ROUTING_HOPS = 8;
const FALLBACK_ROUTE_ORDER = Object.freeze([
    STRATEGY_IDS.RULE_BASED,
    STRATEGY_IDS.FAQ,
    STRATEGY_IDS.RAG,
    STRATEGY_IDS.LLM,
    STRATEGY_IDS.HUMAN_HANDOFF
]);

/**
 * Routing engine for the strategy chain. The orchestrator executes strategies,
 * but this class owns which strategy should run next.
 */
class RoutingEngine {
    constructor(options = {}) {
        this.maxRoutingHops = options.maxRoutingHops || DEFAULT_MAX_ROUTING_HOPS;
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
            return this.#getInitialRoute(context);
        }

        return this.#getFollowUpRoute(context);
    }

    /**
     * Route the first strategy based on whether the conversation already has state.
     * @param {Object} context Routing context.
     * @returns {Object} Route decision.
     */
    #getInitialRoute(context) {
        const activeState = context.conversation?.state || null;

        if (activeState) {
            logger.debug("Routing active conversation to state strategy", {
                customerId: context.customer?.customerId || null,
                activeState
            });
            return createStrategyRoute(
                STRATEGY_IDS.STATE,
                "active conversation state found",
                { activeState }
            );
        }

        logger.debug("Routing message to rule-based strategy", {
            customerId: context.customer?.customerId || null
        });
        return createStrategyRoute(
            STRATEGY_IDS.RULE_BASED,
            "no active state found"
        );
    }

    /**
    * Route after a strategy has completed without producing a final response.
    * @param {Object} context Routing context.
    * @returns {Object} Route decision.
    */
    #getFollowUpRoute(context) {
        const previousResult = context.previousResult;

        if (previousResult.outcome === STRATEGY_OUTCOMES.RESPOND) {
            return createEndRoute("strategy already produced a response");
        }

        if (previousResult.outcome === STRATEGY_OUTCOMES.END) {
            return createEndRoute(previousResult.reason);
        }

        if (previousResult.metadata?.forceHumanHandoff) {
            return this.#routeToHumanHandoff(context, previousResult.reason);
        }

        if (
            previousResult.outcome === STRATEGY_OUTCOMES.CONTINUE ||
            previousResult.outcome === STRATEGY_OUTCOMES.FALLBACK
        ) {
            return this.#getNextFallbackRoute(context);
        }

        logger.debug("No further route available, using fallback", {
            customerId: context.customer?.customerId || null,
            previousStrategy: previousResult.strategyId,
            previousOutcome: previousResult.outcome,
            previousReason: previousResult.reason
        });
        return createFallbackRoute("no routed strategy handled the request");
    }

    /**
     * Move to the next strategy in the fallback order.
     * @param {Object} context Routing context.
     * @returns {Object} Route decision.
     */
    #getNextFallbackRoute(context) {
        const previousResult = context.previousResult;
        const visitedStrategies = context.visitedStrategies || [];

        if (previousResult.strategyId === STRATEGY_IDS.STATE) {
            const nextStrategy = this.#firstUnvisitedFallbackStrategy(visitedStrategies);

            if (nextStrategy) {
                logger.debug("State strategy continued, routing to fallback chain", {
                    customerId: context.customer?.customerId || null,
                    nextStrategy,
                    previousReason: previousResult.reason
                });
                return createStrategyRoute(
                    nextStrategy,
                    "state strategy did not handle",
                    { previousStrategy: STRATEGY_IDS.STATE }
                );
            }
        }

        const previousIndex = FALLBACK_ROUTE_ORDER.indexOf(previousResult.strategyId);

        if (previousIndex >= 0) {
            const nextStrategy = FALLBACK_ROUTE_ORDER
                .slice(previousIndex + 1)
                .find((strategyId) => !visitedStrategies.includes(strategyId));

            if (nextStrategy) {
                logger.debug("Routing to next fallback strategy", {
                    customerId: context.customer?.customerId || null,
                    previousStrategy: previousResult.strategyId,
                    previousOutcome: previousResult.outcome,
                    previousReason: previousResult.reason,
                    nextStrategy
                });
                return createStrategyRoute(
                    nextStrategy,
                    `${previousResult.strategyId} did not handle`,
                    {
                        previousStrategy: previousResult.strategyId,
                        previousOutcome: previousResult.outcome
                    }
                );
            }
        }

        logger.debug("Fallback route chain exhausted", {
            customerId: context.customer?.customerId || null,
            previousStrategy: previousResult.strategyId,
            previousOutcome: previousResult.outcome,
            previousReason: previousResult.reason
        });
        return createFallbackRoute("no routed strategy handled the request");
    }

    /**
     * Prefer human handoff after strategy execution errors.
     * @param {Object} context Routing context.
     * @param {string} reason Routing reason.
     * @returns {Object} Route decision.
     */
    #routeToHumanHandoff(context, reason) {
        if (!context.visitedStrategies.includes(STRATEGY_IDS.HUMAN_HANDOFF)) {
            logger.warn("Routing to human handoff after strategy failure", {
                customerId: context.customer?.customerId || null,
                reason
            });
            return createStrategyRoute(
                STRATEGY_IDS.HUMAN_HANDOFF,
                "strategy failure requires safe handoff fallback",
                { previousReason: reason }
            );
        }

        logger.warn("Human handoff already attempted after strategy failure", {
            customerId: context.customer?.customerId || null,
            reason
        });
        return createFallbackRoute("human handoff already attempted after strategy failure");
    }

    /**
     * Find the first unvisited strategy in the fallback order.
     * @param {Array<string>} visitedStrategies Strategy ids already executed.
     * @returns {string|null} Strategy id or null.
     */
    #firstUnvisitedFallbackStrategy(visitedStrategies) {
        return (
            FALLBACK_ROUTE_ORDER.find(
                (strategyId) => !visitedStrategies.includes(strategyId)
            ) || null
        );
    }
}

module.exports = new RoutingEngine();
module.exports.RoutingEngine = RoutingEngine;
module.exports.DEFAULT_MAX_ROUTING_HOPS = DEFAULT_MAX_ROUTING_HOPS;
