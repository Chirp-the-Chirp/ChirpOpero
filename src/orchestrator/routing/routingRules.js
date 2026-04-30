"use strict";

const { STRATEGY_IDS } = require("./strategyIdentifiers");
const {
    STRATEGY_OUTCOMES
} = require("./routingStrategyResultContract");
const {
    createStrategyRoute,
    createFallbackRoute,
    createEndRoute
} = require("./routeDecisionContract");

const DEFAULT_FALLBACK_CHAIN = Object.freeze([
    STRATEGY_IDS.RULE_BASED,
    STRATEGY_IDS.FAQ,
    STRATEGY_IDS.RAG,
    STRATEGY_IDS.LLM,
    STRATEGY_IDS.HUMAN_HANDOFF
]);

function createRouteMetadata(context, ruleName, overrides = {}) {
    return {
        ruleName,
        hopCount: context.hopCount,
        selectedStrategy: overrides.selectedStrategy || null,
        previousStrategy:
            overrides.previousStrategy !== undefined
                ? overrides.previousStrategy
                : context.previousStrategy || null,
        fallbackReason:
            overrides.fallbackReason !== undefined
                ? overrides.fallbackReason
                : context.fallbackReason || null,
        routeHistoryLength: Array.isArray(context.routeHistory)
            ? context.routeHistory.length
            : 0,
        ...overrides
    };
}

function findNextFallbackStrategy(context, fallbackChain) {
    const previousStrategy = context.previousResult?.strategyId || null;
    const visitedStrategies = context.visitedStrategies || [];

    if (previousStrategy === STRATEGY_IDS.STATE) {
        return (
            fallbackChain.find(
                (strategyId) => !visitedStrategies.includes(strategyId)
            ) || null
        );
    }

    const previousIndex = fallbackChain.indexOf(previousStrategy);

    if (previousIndex < 0) {
        return null;
    }

    return (
        fallbackChain
            .slice(previousIndex + 1)
            .find((strategyId) => !visitedStrategies.includes(strategyId)) || null
    );
}

function createDefaultRoutingRules(options = {}) {
    const fallbackChain = options.fallbackChain || DEFAULT_FALLBACK_CHAIN;

    return {
        initial: [
            {
                name: "active_state_first",
                matches: (context) => Boolean(context.conversation?.state),
                decide: (context) =>
                    createStrategyRoute(
                        STRATEGY_IDS.STATE,
                        "active conversation state found",
                        createRouteMetadata(context, "active_state_first", {
                            selectedStrategy: STRATEGY_IDS.STATE,
                            activeState: context.conversation.state
                        })
                    )
            },
            {
                name: "default_rule_based_first",
                matches: () => true,
                decide: (context) =>
                    createStrategyRoute(
                        STRATEGY_IDS.RULE_BASED,
                        "no active state found",
                        createRouteMetadata(context, "default_rule_based_first", {
                            selectedStrategy: STRATEGY_IDS.RULE_BASED
                        })
                    )
            }
        ],
        followUp: [
            {
                name: "response_ends_routing",
                matches: (context) =>
                    context.previousResult?.outcome === STRATEGY_OUTCOMES.RESPOND,
                decide: (context) =>
                    createEndRoute(
                        "strategy already produced a response",
                        createRouteMetadata(context, "response_ends_routing", {
                            responseSource:
                                context.previousResult?.metadata?.responseSource || null
                        })
                    )
            },
            {
                name: "explicit_end",
                matches: (context) =>
                    context.previousResult?.outcome === STRATEGY_OUTCOMES.END,
                decide: (context) =>
                    createEndRoute(
                        context.previousResult.reason,
                        createRouteMetadata(context, "explicit_end")
                    )
            },
            {
                name: "strategy_failure_to_handoff",
                matches: (context) =>
                    context.previousResult?.metadata?.forceHumanHandoff === true,
                decide: (context) => {
                    if (context.visitedStrategies.includes(STRATEGY_IDS.HUMAN_HANDOFF)) {
                        return createFallbackRoute(
                            "human handoff already attempted after strategy failure",
                            createRouteMetadata(
                                context,
                                "strategy_failure_to_handoff",
                                {
                                    fallbackReason:
                                        "human handoff already attempted after strategy failure"
                                }
                            )
                        );
                    }

                    return createStrategyRoute(
                        STRATEGY_IDS.HUMAN_HANDOFF,
                        "strategy failure requires safe handoff fallback",
                        createRouteMetadata(
                            context,
                            "strategy_failure_to_handoff",
                            {
                                selectedStrategy: STRATEGY_IDS.HUMAN_HANDOFF,
                                fallbackReason: context.previousResult.reason
                            }
                        )
                    );
                }
            },
            {
                name: "fallback_chain",
                matches: (context) =>
                    context.previousResult?.outcome === STRATEGY_OUTCOMES.CONTINUE ||
                    context.previousResult?.outcome === STRATEGY_OUTCOMES.FALLBACK,
                decide: (context) => {
                    const nextStrategy = findNextFallbackStrategy(
                        context,
                        fallbackChain
                    );

                    if (!nextStrategy) {
                        return createFallbackRoute(
                            "no routed strategy handled the request",
                            createRouteMetadata(context, "fallback_chain", {
                                fallbackReason: context.previousResult?.reason || null
                            })
                        );
                    }

                    return createStrategyRoute(
                        nextStrategy,
                        context.previousResult?.strategyId === STRATEGY_IDS.STATE
                            ? "state strategy did not handle"
                            : `${context.previousResult.strategyId} did not handle`,
                        createRouteMetadata(context, "fallback_chain", {
                            selectedStrategy: nextStrategy,
                            previousStrategy:
                                context.previousResult?.strategyId || null,
                            fallbackReason: context.previousResult?.reason || null
                        })
                    );
                }
            },
            {
                name: "unhandled_follow_up",
                matches: () => true,
                decide: (context) =>
                    createFallbackRoute(
                        "no routed strategy handled the request",
                        createRouteMetadata(context, "unhandled_follow_up", {
                            fallbackReason: context.previousResult?.reason || null
                        })
                    )
            }
        ]
    };
}

function selectRouteFromRules(rules, context) {
    for (const rule of rules) {
        if (rule.matches(context)) {
            return rule.decide(context);
        }
    }

    return createFallbackRoute("no routing rule matched", {
        ruleName: "no_match",
        hopCount: context.hopCount
    });
}

module.exports = {
    DEFAULT_FALLBACK_CHAIN,
    createDefaultRoutingRules,
    selectRouteFromRules,
    findNextFallbackStrategy
};
