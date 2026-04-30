"use strict";

const {
    createFallbackDecision,
    createErrorDecision,
    createNoReplyDecision
} = require("./decisionFactory");
const {
    normalizeOrchestratorContext,
    validateOrchestratorContext
} = require("./contracts/orchestratorContext");
const {
    assertValidStrategyResult
} = require("./contracts/strategyResultContract");
const {
    assertValidStrategyModule
} = require("./contracts/strategyContract");
const {
    createRoutingContext
} = require("./routing/routingContextContract");
const {
    ROUTE_ACTIONS,
    assertValidRouteDecision
} = require("./routing/routeDecisionContract");
const {
    STRATEGY_OUTCOMES,
    createRoutingStrategyResult,
    adaptStrategyResult
} = require("./routing/routingStrategyResultContract");
const { STRATEGY_IDS } = require("./routing/strategyIdentifiers");
const routingEngine = require("./routing/routingEngine");
const { DEFAULT_MAX_ROUTING_HOPS } = require("./routing/routingEngine");
const strategyRegistry = require("./routing/defaultStrategyRegistry");
const { createLogger } = require("../utils/logger");

const logger = createLogger("ConversationOrchestrator");
const MAX_ROUTING_HOPS = DEFAULT_MAX_ROUTING_HOPS;

/**
 * The orchestrator owns request validation and strategy execution. Route
 * selection now belongs to the routing engine so future intent/RAG/LLM routing
 * can be added without hardcoding another sequential pipeline here.
 */

/**
 * Append a routing history entry for later debugging.
 * @param {Array<Object>} routeHistory Mutable route history array.
 * @param {Object} route Route decision used for the hop.
 * @param {Object|null} routingResult Routing result produced by the strategy.
 * @param {number} hopCount Current hop count.
 */
function appendRouteHistory(routeHistory, route, routingResult, hopCount) {
    routeHistory.push({
        hopCount,
        action: route.action,
        selectedStrategy: route.metadata?.selectedStrategy || route.nextStrategy || null,
        previousStrategy: route.metadata?.previousStrategy || null,
        routeReason: route.reason,
        ruleName: route.metadata?.ruleName || null,
        outcome: routingResult?.outcome || null,
        fallbackReason:
            routingResult?.metadata?.fallbackReason ||
            route.metadata?.fallbackReason ||
            null,
        responseSource:
            routingResult?.metadata?.responseSource ||
            routingResult?.decision?.source ||
            null
    });
}

/**
 * Resolve a strategy module from the shared strategy registry.
 * @param {Object} registry Strategy registry implementation.
 * @param {string} strategyId Strategy key selected by the routing engine.
 * @returns {Object|null} Strategy module or null.
 */
function resolveStrategy(registry, strategyId) {
    return registry.resolve(strategyId);
}

/**
 * Build the routing context for the current hop.
 * @param {Object} context Normalized orchestrator context.
 * @param {Object} options Routing state.
 * @returns {Object} Routing context.
 */
function buildRoutingContext(context, options) {
    return createRoutingContext(context, {
        previousResult: options.previousResult,
        visitedStrategies: options.visitedStrategies,
        routeHistory: options.routeHistory,
        selectedStrategy: options.selectedStrategy,
        previousStrategy: options.previousResult?.strategyId || null,
        fallbackReason:
            options.previousResult?.metadata?.fallbackReason ||
            (options.previousResult?.outcome === STRATEGY_OUTCOMES.FALLBACK
                ? options.previousResult.reason
                : null),
        responseSource:
            options.previousResult?.metadata?.responseSource ||
            options.previousResult?.decision?.source ||
            null,
        hopCount: options.hopCount
    });
}

function createConversationOrchestrator(options = {}) {
    const registry = options.strategyRegistry || strategyRegistry;
    const activeRoutingEngine = options.routingEngine || routingEngine;

    /**
     * Execute pre-checks as a lightweight orchestrator gate before routing starts.
 * @param {Object} context Normalized orchestrator context.
 * @returns {Promise<Object|null>} Early decision or null when routing can continue.
 */
    async function runPreCheck(context) {
        const strategy = resolveStrategy(registry, STRATEGY_IDS.PRE_CHECK);

        if (!strategy) {
            throw new Error("pre-check strategy is not registered");
        }

        assertValidStrategyModule(strategy);

        logger.debug("Running orchestrator pre-check", {
            strategy: strategy.name,
            messageId: context.message.messageId
        });

        const result = assertValidStrategyResult(await strategy.execute(context));

        logger.debug("Pre-check completed", {
            messageId: context.message.messageId,
            handled: result.handled,
            reason: result.reason || null
        });

        return result.handled ? result.decision : null;
    }

    /**
     * Convert a routing outcome into the final orchestrator decision when possible.
     * @param {Object} routingResult Routing strategy result.
     * @returns {Object|null} Final decision or null.
     */
    function getDecisionFromRoutingResult(routingResult) {
        if (!routingResult) {
            return null;
        }

        if (routingResult.outcome === STRATEGY_OUTCOMES.RESPOND) {
            return routingResult.decision;
        }

        if (routingResult.outcome === STRATEGY_OUTCOMES.END) {
            return createNoReplyDecision(routingResult.reason);
        }

        return null;
    }

    /**
     * Run template policy checks against a selected response before it is returned.
     * @param {Object} context Normalized orchestrator context.
     * @param {Object} decision Selected decision.
     * @returns {Promise<Object>} Original or policy-adjusted decision.
     */
    async function applyTemplatePolicy(context, decision) {
        if (!decision || !decision.response) {
            return decision;
        }

        const strategy = resolveStrategy(registry, STRATEGY_IDS.TEMPLATE_POLICY);

        if (!strategy) {
            return decision;
        }

        assertValidStrategyModule(strategy);
        const policyContext = {
            ...context,
            candidateDecision: decision,
            decision
        };

        logger.debug("Running template policy evaluator", {
            strategy: strategy.name,
            messageId: context.message.messageId,
            responseSource: decision.source
        });

        let result;

        try {
            result = assertValidStrategyResult(await strategy.execute(policyContext));
        } catch (error) {
            logger.error("Template policy evaluator failed, keeping selected response", {
                messageId: context.message.messageId,
                responseSource: decision.source,
                error
            });
            return decision;
        }

        logger.debug("Template policy evaluator completed", {
            messageId: context.message.messageId,
            handled: result.handled,
            outcome: result.outcome || null,
            reason: result.reason || null
        });

        if (result.handled || result.outcome === STRATEGY_OUTCOMES.RESPOND) {
            return result.decision;
        }

        return decision;
    }

    /**
     * Keep in-memory routing context aligned with a strategy result for the current
     * loop. Persistent state is still handled downstream from the final decision.
     * @param {Object} context Normalized orchestrator context.
     * @param {Object} strategyResult Raw strategy result.
     */
    function updateContextFromStrategyResult(context, strategyResult) {
        if (Object.prototype.hasOwnProperty.call(strategyResult, "nextState")) {
            context.conversation = {
                ...context.conversation,
                state: strategyResult.nextState
            };
        }
    }

    /**
     * Ask the routing engine for strategies and execute them with loop protection.
     * @param {Object} context Normalized orchestrator context.
     * @returns {Promise<Object|null>} Final decision or null.
     */
    async function runRoutedStrategies(context) {
        const visitedStrategies = [];
        const routeHistory = [];
        let previousResult = null;
        let selectedStrategy = null;

        for (let hopCount = 0; hopCount < MAX_ROUTING_HOPS; hopCount += 1) {
            const routingContext = buildRoutingContext(context, {
                previousResult,
                visitedStrategies,
                routeHistory,
                selectedStrategy,
                hopCount
            });
            const route = assertValidRouteDecision(
                activeRoutingEngine.getNextRoute(routingContext)
            );

            logger.debug("Routing engine selected route", {
                messageId: context.message.messageId,
                hopCount,
                route
            });

            if (route.action === ROUTE_ACTIONS.FALLBACK) {
                logger.warn("Routing engine requested fallback", {
                    messageId: context.message.messageId,
                    hopCount,
                    reason: route.reason,
                    fallbackReason: route.metadata?.fallbackReason || null
                });
                appendRouteHistory(routeHistory, route, previousResult, hopCount);
                return createFallbackDecision();
            }

            if (route.action === ROUTE_ACTIONS.END) {
                appendRouteHistory(routeHistory, route, previousResult, hopCount);
                return getDecisionFromRoutingResult(previousResult) || null;
            }

            const strategy = resolveStrategy(registry, route.nextStrategy);

            if (!strategy) {
                logger.error("Routing engine selected an unavailable strategy", {
                    messageId: context.message.messageId,
                    route
                });
                return createErrorDecision("routing engine selected unavailable strategy");
            }

            assertValidStrategyModule(strategy);

            if (visitedStrategies.includes(route.nextStrategy)) {
                logger.warn("Routing loop detected, using fallback", {
                    messageId: context.message.messageId,
                    strategy: route.nextStrategy,
                    visitedStrategies
                });
                return createFallbackDecision();
            }

            selectedStrategy = route.nextStrategy;
            visitedStrategies.push(route.nextStrategy);
            logger.debug("Executing routed strategy", {
                strategy: strategy.name,
                messageId: context.message.messageId,
                hopCount,
                previousStrategy: route.metadata?.previousStrategy || null
            });

            let strategyResult;

            try {
                strategyResult = assertValidStrategyResult(
                    await strategy.execute(context)
                );
            } catch (error) {
                logger.error("Routed strategy failed", {
                    strategy: strategy.name,
                    messageId: context.message.messageId,
                    hopCount,
                    error
                });

                if (route.nextStrategy === STRATEGY_IDS.HUMAN_HANDOFF) {
                    appendRouteHistory(routeHistory, route, previousResult, hopCount);
                    return createFallbackDecision();
                }

                previousResult = createRoutingStrategyResult(
                    route.nextStrategy,
                    STRATEGY_OUTCOMES.FALLBACK,
                    {
                        reason: `${route.nextStrategy} failed`,
                        previousStrategy: route.metadata?.previousStrategy || null,
                        hopCount,
                        fallbackReason: `${route.nextStrategy} failed`,
                        metadata: {
                            forceHumanHandoff: true,
                            errorMessage: error.message,
                            routeHistoryLength: routeHistory.length
                        }
                    }
                );
                appendRouteHistory(routeHistory, route, previousResult, hopCount);
                continue;
            }

            updateContextFromStrategyResult(context, strategyResult);
            previousResult = adaptStrategyResult(
                route.nextStrategy,
                strategyResult,
                {
                    previousStrategy: route.metadata?.previousStrategy || null,
                    hopCount
                }
            );
            appendRouteHistory(routeHistory, route, previousResult, hopCount);

            logger.debug("Routed strategy completed", {
                strategy: strategy.name,
                messageId: context.message.messageId,
                hopCount,
                outcome: previousResult.outcome,
                reason: previousResult.reason,
                responseSource: previousResult.metadata?.responseSource || null
            });

            if (previousResult.outcome === STRATEGY_OUTCOMES.FALLBACK) {
                logger.warn("Routed strategy requested fallback", {
                    strategy: strategy.name,
                    messageId: context.message.messageId,
                    hopCount,
                    reason: previousResult.reason
                });
            }

            const decision = getDecisionFromRoutingResult(previousResult);

            if (decision) {
                logger.info("Routed strategy produced final decision", {
                    strategy: strategy.name,
                    messageId: context.message.messageId,
                    responseSource: decision.source,
                    action: decision.action,
                    routeHistory
                });
                return decision;
            }
        }

        logger.warn("Routing hop limit reached, using fallback", {
            messageId: context.message.messageId,
            maxHops: MAX_ROUTING_HOPS
        });
        return createFallbackDecision();
    }

    /**
     * Run the deterministic-first orchestration pipeline and return a decision.
     * @param {Object} input Orchestrator input payload.
     * @returns {Promise<Object>} Structured orchestrator decision.
     */
    async function orchestrate(input) {
        const context = normalizeOrchestratorContext(input);
        const validation = validateOrchestratorContext(context);

        if (!validation.valid) {
            logger.error("Invalid orchestrator context", {
                reason: validation.reason,
                input
            });
            return createErrorDecision(validation.reason);
        }

        try {
            const preCheckDecision = await runPreCheck(context);

            if (preCheckDecision) {
                return preCheckDecision;
            }

            const decision = await runRoutedStrategies(context);

            if (decision) {
                const policyDecision = await applyTemplatePolicy(context, decision);

                logger.info("Final orchestrator response selected", {
                    messageId: context.message.messageId,
                    responseSource: policyDecision.source,
                    action: policyDecision.action
                });

                return policyDecision;
            }

            const fallbackDecision = createFallbackDecision();
            logger.debug("No strategy handled request, using fallback", {
                messageId: context.message.messageId,
                decision: fallbackDecision
            });

            return applyTemplatePolicy(context, fallbackDecision);
        } catch (error) {
            logger.error("Orchestration pipeline failed", {
                messageId: context.message.messageId,
                error
            });

            return createErrorDecision("orchestration pipeline failed unexpectedly");
        }
    }

    return {
        orchestrate
    };
}

const defaultConversationOrchestrator = createConversationOrchestrator();

module.exports = defaultConversationOrchestrator;
module.exports.createConversationOrchestrator = createConversationOrchestrator;
