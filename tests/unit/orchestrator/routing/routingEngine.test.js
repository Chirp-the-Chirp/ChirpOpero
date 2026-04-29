"use strict";

jest.mock("../../../../src/utils/logger", () => ({
    createLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

const routingEngine = require("../../../../src/orchestrator/routing/routingEngine");
const {
    ROUTE_ACTIONS
} = require("../../../../src/orchestrator/routing/routeDecisionContract");
const {
    STRATEGY_IDS
} = require("../../../../src/orchestrator/routing/strategyIdentifiers");
const {
    STRATEGY_OUTCOMES
} = require("../../../../src/orchestrator/routing/routingStrategyResultContract");

describe("RoutingEngine", () => {
    // These tests lock down Phase 2 routing: state first when active, then fallback chain.

    function createContext(overrides = {}) {
        return {
            message: {
                messageId: "wamid.text.001",
                text: "hello"
            },
            conversation: {
                state: null
            },
            customer: {
                customerId: "94770000001"
            },
            metadata: {
                channel: "whatsapp"
            },
            previousResult: null,
            visitedStrategies: [],
            hopCount: 0,
            ...overrides
        };
    }

    test("routes active conversations to stateStrategy first", () => {
        const route = routingEngine.getNextRoute(
            createContext({
                conversation: {
                    state: "WAITING_FOR_ORDER_ID"
                }
            })
        );

        expect(route).toMatchObject({
            action: ROUTE_ACTIONS.RUN_STRATEGY,
            nextStrategy: STRATEGY_IDS.STATE,
            reason: "active conversation state found"
        });
    });

    test("routes conversations without active state to ruleBasedStrategy", () => {
        const route = routingEngine.getNextRoute(createContext());

        expect(route).toMatchObject({
            action: ROUTE_ACTIONS.RUN_STRATEGY,
            nextStrategy: STRATEGY_IDS.RULE_BASED,
            reason: "no active state found"
        });
    });

    test("routes to ruleBasedStrategy after stateStrategy continues", () => {
        const route = routingEngine.getNextRoute(
            createContext({
                previousResult: {
                    strategyId: STRATEGY_IDS.STATE,
                    outcome: STRATEGY_OUTCOMES.CONTINUE,
                    decision: null,
                    reason: "state skipped",
                    metadata: {}
                },
                visitedStrategies: [STRATEGY_IDS.STATE],
                hopCount: 1
            })
        );

        expect(route).toMatchObject({
            action: ROUTE_ACTIONS.RUN_STRATEGY,
            nextStrategy: STRATEGY_IDS.RULE_BASED,
            reason: "state strategy did not handle"
        });
    });

    test("routes from ruleBasedStrategy to faqStrategy after continue", () => {
        const route = routingEngine.getNextRoute(
            createContext({
                previousResult: {
                    strategyId: STRATEGY_IDS.RULE_BASED,
                    outcome: STRATEGY_OUTCOMES.CONTINUE,
                    decision: null,
                    reason: "rule skipped",
                    metadata: {}
                },
                visitedStrategies: [STRATEGY_IDS.RULE_BASED],
                hopCount: 1
            })
        );

        expect(route).toMatchObject({
            action: ROUTE_ACTIONS.RUN_STRATEGY,
            nextStrategy: STRATEGY_IDS.FAQ,
            reason: "ruleBasedStrategy did not handle"
        });
    });

    test("continues fallback route order through faq, rag, llm, and handoff", () => {
        const faqRoute = routingEngine.getNextRoute(
            createContext({
                previousResult: {
                    strategyId: STRATEGY_IDS.FAQ,
                    outcome: STRATEGY_OUTCOMES.CONTINUE,
                    decision: null,
                    reason: "faq skipped",
                    metadata: {}
                },
                visitedStrategies: [STRATEGY_IDS.RULE_BASED, STRATEGY_IDS.FAQ],
                hopCount: 2
            })
        );
        const ragRoute = routingEngine.getNextRoute(
            createContext({
                previousResult: {
                    strategyId: STRATEGY_IDS.RAG,
                    outcome: STRATEGY_OUTCOMES.CONTINUE,
                    decision: null,
                    reason: "rag skipped",
                    metadata: {}
                },
                visitedStrategies: [
                    STRATEGY_IDS.RULE_BASED,
                    STRATEGY_IDS.FAQ,
                    STRATEGY_IDS.RAG
                ],
                hopCount: 3
            })
        );
        const llmRoute = routingEngine.getNextRoute(
            createContext({
                previousResult: {
                    strategyId: STRATEGY_IDS.LLM,
                    outcome: STRATEGY_OUTCOMES.CONTINUE,
                    decision: null,
                    reason: "llm skipped",
                    metadata: {}
                },
                visitedStrategies: [
                    STRATEGY_IDS.RULE_BASED,
                    STRATEGY_IDS.FAQ,
                    STRATEGY_IDS.RAG,
                    STRATEGY_IDS.LLM
                ],
                hopCount: 4
            })
        );

        expect(faqRoute.nextStrategy).toBe(STRATEGY_IDS.RAG);
        expect(ragRoute.nextStrategy).toBe(STRATEGY_IDS.LLM);
        expect(llmRoute.nextStrategy).toBe(STRATEGY_IDS.HUMAN_HANDOFF);
    });

    test("fallback outcomes move to the next fallback strategy", () => {
        const route = routingEngine.getNextRoute(
            createContext({
                previousResult: {
                    strategyId: STRATEGY_IDS.FAQ,
                    outcome: STRATEGY_OUTCOMES.FALLBACK,
                    decision: null,
                    reason: "faq confidence too low",
                    metadata: {}
                },
                visitedStrategies: [STRATEGY_IDS.RULE_BASED, STRATEGY_IDS.FAQ],
                hopCount: 2
            })
        );

        expect(route).toMatchObject({
            action: ROUTE_ACTIONS.RUN_STRATEGY,
            nextStrategy: STRATEGY_IDS.RAG,
            reason: "faqStrategy did not handle"
        });
    });

    test("end outcomes terminate routing", () => {
        const route = routingEngine.getNextRoute(
            createContext({
                previousResult: {
                    strategyId: STRATEGY_IDS.LLM,
                    outcome: STRATEGY_OUTCOMES.END,
                    decision: null,
                    reason: "conversation closed",
                    metadata: {}
                },
                visitedStrategies: [STRATEGY_IDS.LLM],
                hopCount: 1
            })
        );

        expect(route).toMatchObject({
            action: ROUTE_ACTIONS.END,
            nextStrategy: null,
            reason: "conversation closed"
        });
    });

    test("routes strategy failures to humanHandoffStrategy when possible", () => {
        const route = routingEngine.getNextRoute(
            createContext({
                previousResult: {
                    strategyId: STRATEGY_IDS.RAG,
                    outcome: STRATEGY_OUTCOMES.FALLBACK,
                    decision: null,
                    reason: "ragStrategy failed",
                    metadata: {
                        forceHumanHandoff: true
                    }
                },
                visitedStrategies: [STRATEGY_IDS.RULE_BASED, STRATEGY_IDS.RAG],
                hopCount: 2
            })
        );

        expect(route).toMatchObject({
            action: ROUTE_ACTIONS.RUN_STRATEGY,
            nextStrategy: STRATEGY_IDS.HUMAN_HANDOFF,
            reason: "strategy failure requires safe handoff fallback"
        });
    });

    test("falls back when the hop limit is reached", () => {
        const route = routingEngine.getNextRoute(
            createContext({
                hopCount: 8
            })
        );

        expect(route).toMatchObject({
            action: ROUTE_ACTIONS.FALLBACK,
            nextStrategy: null,
            reason: "routing hop limit reached"
        });
    });
});
