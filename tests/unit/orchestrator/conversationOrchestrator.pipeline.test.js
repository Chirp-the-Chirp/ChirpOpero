"use strict";

describe("ConversationOrchestrator routing", () => {
    // These tests verify pre-check gating, routing decisions, fallback, and error handling.

    function createInput() {
        return {
            message: {
                messageId: "wamid.text.001",
                from: "94770000001",
                type: "text",
                text: "hello",
                timestamp: "1774078799"
            },
            conversation: {},
            customer: {
                customerId: "94770000001"
            },
            metadata: {
                channel: "whatsapp"
            }
        };
    }

    async function loadOrchestrator(strategyMocks) {
        jest.resetModules();

        jest.doMock("../../../src/utils/logger", () => ({
            createLogger: jest.fn(() => ({
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            }))
        }));

        jest.doMock(
            "../../../src/orchestrator/strategies/preCheckStrategy",
            () => strategyMocks.preCheckStrategy
        );
        jest.doMock(
            "../../../src/orchestrator/strategies/stateStrategy",
            () => strategyMocks.stateStrategy
        );
        jest.doMock(
            "../../../src/orchestrator/strategies/ruleBasedStrategy",
            () => strategyMocks.ruleBasedStrategy
        );
        jest.doMock(
            "../../../src/orchestrator/strategies/faqStrategy",
            () => strategyMocks.faqStrategy
        );
        jest.doMock(
            "../../../src/orchestrator/strategies/ragStrategy",
            () => strategyMocks.ragStrategy
        );
        jest.doMock(
            "../../../src/orchestrator/strategies/llmStrategy",
            () => strategyMocks.llmStrategy
        );
        jest.doMock(
            "../../../src/orchestrator/strategies/humanHandoffStrategy",
            () => strategyMocks.humanHandoffStrategy
        );
        jest.doMock(
            "../../../src/orchestrator/policies/templatePolicyEvaluator",
            () => strategyMocks.templatePolicyEvaluator
        );

        return require("../../../src/orchestrator/conversationOrchestrator");
    }

    async function loadOrchestratorFactory() {
        jest.resetModules();

        jest.doMock("../../../src/utils/logger", () => ({
            createLogger: jest.fn(() => ({
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn()
            }))
        }));

        return require("../../../src/orchestrator/conversationOrchestrator");
    }

    test("routes directly to ruleBasedStrategy when no active state exists", async () => {
        const preCheckStrategy = {
            name: "preCheckStrategy",
            execute: jest.fn().mockResolvedValue({
                handled: false,
                reason: "pre-checks passed"
            })
        };
        const stateStrategy = {
            name: "stateStrategy",
            execute: jest.fn().mockResolvedValue({
                handled: false,
                reason: "no active conversation-state handler configured"
            })
        };
        const ruleBasedStrategy = {
            name: "ruleBasedStrategy",
            execute: jest.fn().mockResolvedValue({
                handled: true,
                decision: {
                    action: "reply",
                    source: "rule_engine",
                    response: {
                        type: "text",
                        text: "Handled by rule strategy"
                    },
                    nextState: null,
                    handoffRequired: false,
                    reason: "rule hit",
                    confidence: 0.9
                },
                reason: "rule hit"
            })
        };
        const faqStrategy = {
            name: "faqStrategy",
            execute: jest.fn().mockResolvedValue({
                handled: false,
                reason: "faq strategy not implemented"
            })
        };

        const { orchestrate } = await loadOrchestrator({
            preCheckStrategy,
            stateStrategy,
            ruleBasedStrategy,
            faqStrategy,
            ragStrategy: {
                name: "ragStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "rag strategy not implemented"
                })
            },
            llmStrategy: {
                name: "llmStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "llm strategy not implemented"
                })
            },
            templatePolicyEvaluator: {
                name: "templatePolicyEvaluator",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "template policy evaluator not implemented"
                })
            },
            humanHandoffStrategy: {
                name: "humanHandoffStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "human handoff strategy not implemented"
                })
            }
        });

        const decision = await orchestrate(createInput());

        expect(preCheckStrategy.execute).toHaveBeenCalledTimes(1);
        expect(stateStrategy.execute).not.toHaveBeenCalled();
        expect(ruleBasedStrategy.execute).toHaveBeenCalledTimes(1);
        expect(faqStrategy.execute).not.toHaveBeenCalled();
        expect(decision.response.text).toBe("Handled by rule strategy");
    });

    test("lets stateStrategy short-circuit the pipeline before ruleBasedStrategy", async () => {
        const preCheckStrategy = {
            name: "preCheckStrategy",
            execute: jest.fn().mockResolvedValue({
                handled: false,
                reason: "pre-checks passed"
            })
        };
        const stateStrategy = {
            name: "stateStrategy",
            execute: jest.fn().mockResolvedValue({
                handled: true,
                decision: {
                    action: "reply",
                    source: "rule_engine",
                    response: {
                        type: "text",
                        text: "Checking your order..."
                    },
                    nextState: null,
                    handoffRequired: false,
                    reason: "handled WAITING_FOR_ORDER_ID state",
                    confidence: 0.95
                },
                reason: "continued WAITING_FOR_ORDER_ID flow"
            })
        };
        const ruleBasedStrategy = {
            name: "ruleBasedStrategy",
            execute: jest.fn().mockResolvedValue({
                handled: true,
                decision: {
                    action: "reply",
                    source: "rule_engine",
                    response: {
                        type: "text",
                        text: "Should not run"
                    },
                    nextState: null,
                    handoffRequired: false,
                    reason: "matched greeting",
                    confidence: 0.9
                },
                reason: "matched greeting phrase"
            })
        };

        const { orchestrate } = await loadOrchestrator({
            preCheckStrategy,
            stateStrategy,
            ruleBasedStrategy,
            faqStrategy: {
                name: "faqStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "faq strategy not implemented"
                })
            },
            ragStrategy: {
                name: "ragStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "rag strategy not implemented"
                })
            },
            llmStrategy: {
                name: "llmStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "llm strategy not implemented"
                })
            },
            templatePolicyEvaluator: {
                name: "templatePolicyEvaluator",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "template policy evaluator not implemented"
                })
            },
            humanHandoffStrategy: {
                name: "humanHandoffStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "human handoff strategy not implemented"
                })
            }
        });

        const decision = await orchestrate({
            ...createInput(),
            conversation: {
                state: "WAITING_FOR_ORDER_ID"
            }
        });

        expect(preCheckStrategy.execute).toHaveBeenCalledTimes(1);
        expect(stateStrategy.execute).toHaveBeenCalledTimes(1);
        expect(ruleBasedStrategy.execute).not.toHaveBeenCalled();
        expect(decision.response.text).toBe("Checking your order...");
    });

    test("routes from stateStrategy to ruleBasedStrategy when active state is not handled", async () => {
        const preCheckStrategy = {
            name: "preCheckStrategy",
            execute: jest.fn().mockResolvedValue({
                handled: false,
                reason: "pre-checks passed"
            })
        };
        const stateStrategy = {
            name: "stateStrategy",
            execute: jest.fn().mockResolvedValue({
                handled: false,
                reason: "state skipped"
            })
        };
        const ruleBasedStrategy = {
            name: "ruleBasedStrategy",
            execute: jest.fn().mockResolvedValue({
                handled: true,
                decision: {
                    action: "reply",
                    source: "rule_engine",
                    response: {
                        type: "text",
                        text: "Handled after state skipped"
                    },
                    nextState: null,
                    handoffRequired: false,
                    reason: "rule hit",
                    confidence: 0.9
                },
                reason: "rule hit"
            })
        };

        const { orchestrate } = await loadOrchestrator({
            preCheckStrategy,
            stateStrategy,
            ruleBasedStrategy,
            faqStrategy: {
                name: "faqStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "faq strategy not implemented"
                })
            },
            ragStrategy: {
                name: "ragStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "rag strategy not implemented"
                })
            },
            llmStrategy: {
                name: "llmStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "llm strategy not implemented"
                })
            },
            templatePolicyEvaluator: {
                name: "templatePolicyEvaluator",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "template policy evaluator not implemented"
                })
            },
            humanHandoffStrategy: {
                name: "humanHandoffStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "human handoff strategy not implemented"
                })
            }
        });

        const decision = await orchestrate({
            ...createInput(),
            conversation: {
                state: "UNKNOWN_ACTIVE_STATE"
            }
        });

        expect(preCheckStrategy.execute).toHaveBeenCalledTimes(1);
        expect(stateStrategy.execute).toHaveBeenCalledTimes(1);
        expect(ruleBasedStrategy.execute).toHaveBeenCalledTimes(1);
        expect(decision.response.text).toBe("Handled after state skipped");
    });

    test("returns fallback when no strategy handles the message", async () => {
        const createNotHandledStrategy = (name) => ({
            name,
            execute: jest.fn().mockResolvedValue({
                handled: false,
                reason: `${name} skipped`
            })
        });
        const { orchestrate } = await loadOrchestrator({
            preCheckStrategy: createNotHandledStrategy("preCheckStrategy"),
            stateStrategy: createNotHandledStrategy("stateStrategy"),
            ruleBasedStrategy: createNotHandledStrategy("ruleBasedStrategy"),
            faqStrategy: createNotHandledStrategy("faqStrategy"),
            ragStrategy: createNotHandledStrategy("ragStrategy"),
            llmStrategy: createNotHandledStrategy("llmStrategy"),
            templatePolicyEvaluator: createNotHandledStrategy(
                "templatePolicyEvaluator"
            ),
            humanHandoffStrategy: createNotHandledStrategy(
                "humanHandoffStrategy"
            )
        });

        const decision = await orchestrate(createInput());

        expect(decision.action).toBe("reply");
        expect(decision.reason).toBe("fallback response");
    });

    test("continues from ruleBasedStrategy through faq and stops on faq response", async () => {
        const createNotHandledStrategy = (name) => ({
            name,
            execute: jest.fn().mockResolvedValue({
                handled: false,
                reason: `${name} skipped`
            })
        });
        const faqStrategy = {
            name: "faqStrategy",
            execute: jest.fn().mockResolvedValue({
                handled: true,
                decision: {
                    action: "reply",
                    source: "rule_engine",
                    response: {
                        type: "text",
                        text: "FAQ answer"
                    },
                    nextState: null,
                    handoffRequired: false,
                    reason: "faq hit",
                    confidence: 0.8
                },
                reason: "faq hit"
            })
        };
        const ragStrategy = createNotHandledStrategy("ragStrategy");
        const { orchestrate } = await loadOrchestrator({
            preCheckStrategy: createNotHandledStrategy("preCheckStrategy"),
            stateStrategy: createNotHandledStrategy("stateStrategy"),
            ruleBasedStrategy: createNotHandledStrategy("ruleBasedStrategy"),
            faqStrategy,
            ragStrategy,
            llmStrategy: createNotHandledStrategy("llmStrategy"),
            templatePolicyEvaluator: createNotHandledStrategy(
                "templatePolicyEvaluator"
            ),
            humanHandoffStrategy: createNotHandledStrategy(
                "humanHandoffStrategy"
            )
        });

        const decision = await orchestrate(createInput());

        expect(faqStrategy.execute).toHaveBeenCalledTimes(1);
        expect(ragStrategy.execute).not.toHaveBeenCalled();
        expect(decision.response.text).toBe("FAQ answer");
    });

    test("FALLBACK outcome routes to the next fallback strategy", async () => {
        const createNotHandledStrategy = (name) => ({
            name,
            execute: jest.fn().mockResolvedValue({
                handled: false,
                reason: `${name} skipped`
            })
        });
        const ragStrategy = {
            name: "ragStrategy",
            execute: jest.fn().mockResolvedValue({
                handled: true,
                decision: {
                    action: "reply",
                    source: "rag",
                    response: {
                        type: "text",
                        text: "RAG answer"
                    },
                    nextState: null,
                    handoffRequired: false,
                    reason: "rag hit",
                    confidence: 0.76
                },
                reason: "rag hit"
            })
        };
        const { orchestrate } = await loadOrchestrator({
            preCheckStrategy: createNotHandledStrategy("preCheckStrategy"),
            stateStrategy: createNotHandledStrategy("stateStrategy"),
            ruleBasedStrategy: createNotHandledStrategy("ruleBasedStrategy"),
            faqStrategy: {
                name: "faqStrategy",
                execute: jest.fn().mockResolvedValue({
                    outcome: "FALLBACK",
                    response: null,
                    nextState: null,
                    metadata: {},
                    reason: "faq confidence too low"
                })
            },
            ragStrategy,
            llmStrategy: createNotHandledStrategy("llmStrategy"),
            templatePolicyEvaluator: createNotHandledStrategy(
                "templatePolicyEvaluator"
            ),
            humanHandoffStrategy: createNotHandledStrategy(
                "humanHandoffStrategy"
            )
        });

        const decision = await orchestrate(createInput());

        expect(ragStrategy.execute).toHaveBeenCalledTimes(1);
        expect(decision.response.text).toBe("RAG answer");
    });

    test("END outcome terminates cleanly without a reply", async () => {
        const createNotHandledStrategy = (name) => ({
            name,
            execute: jest.fn().mockResolvedValue({
                handled: false,
                reason: `${name} skipped`
            })
        });
        const faqStrategy = createNotHandledStrategy("faqStrategy");
        const { orchestrate } = await loadOrchestrator({
            preCheckStrategy: createNotHandledStrategy("preCheckStrategy"),
            stateStrategy: createNotHandledStrategy("stateStrategy"),
            ruleBasedStrategy: {
                name: "ruleBasedStrategy",
                execute: jest.fn().mockResolvedValue({
                    outcome: "END",
                    response: null,
                    nextState: null,
                    metadata: {},
                    reason: "message should not receive a reply"
                })
            },
            faqStrategy,
            ragStrategy: createNotHandledStrategy("ragStrategy"),
            llmStrategy: createNotHandledStrategy("llmStrategy"),
            templatePolicyEvaluator: createNotHandledStrategy(
                "templatePolicyEvaluator"
            ),
            humanHandoffStrategy: createNotHandledStrategy(
                "humanHandoffStrategy"
            )
        });

        const decision = await orchestrate(createInput());

        expect(faqStrategy.execute).not.toHaveBeenCalled();
        expect(decision.action).toBe("no_reply");
        expect(decision.reason).toBe("message should not receive a reply");
    });

    test("strategy errors fall back through humanHandoffStrategy", async () => {
        const createNotHandledStrategy = (name) => ({
            name,
            execute: jest.fn().mockResolvedValue({
                handled: false,
                reason: `${name} skipped`
            })
        });
        const humanHandoffStrategy = {
            name: "humanHandoffStrategy",
            execute: jest.fn().mockResolvedValue({
                handled: true,
                decision: {
                    action: "handoff_to_human",
                    source: "human_handoff",
                    response: null,
                    nextState: null,
                    handoffRequired: true,
                    reason: "strategy failure escalated",
                    confidence: 1
                },
                reason: "strategy failure escalated"
            })
        };
        const { orchestrate } = await loadOrchestrator({
            preCheckStrategy: createNotHandledStrategy("preCheckStrategy"),
            stateStrategy: createNotHandledStrategy("stateStrategy"),
            ruleBasedStrategy: {
                name: "ruleBasedStrategy",
                execute: jest.fn().mockRejectedValue(new Error("boom"))
            },
            faqStrategy: createNotHandledStrategy("faqStrategy"),
            ragStrategy: createNotHandledStrategy("ragStrategy"),
            llmStrategy: createNotHandledStrategy("llmStrategy"),
            templatePolicyEvaluator: createNotHandledStrategy(
                "templatePolicyEvaluator"
            ),
            humanHandoffStrategy
        });

        const decision = await orchestrate(createInput());

        expect(humanHandoffStrategy.execute).toHaveBeenCalledTimes(1);
        expect(decision.action).toBe("handoff_to_human");
        expect(decision.reason).toBe("strategy failure escalated");
    });

    test("templatePolicyEvaluator runs before returning the final response", async () => {
        const createNotHandledStrategy = (name) => ({
            name,
            execute: jest.fn().mockResolvedValue({
                handled: false,
                reason: `${name} skipped`
            })
        });
        const templatePolicyEvaluator = {
            name: "templatePolicyEvaluator",
            execute: jest.fn().mockResolvedValue({
                handled: true,
                decision: {
                    action: "reply",
                    source: "template_engine",
                    response: {
                        type: "text",
                        text: "Template-safe answer"
                    },
                    nextState: null,
                    handoffRequired: false,
                    reason: "template policy adjusted response",
                    confidence: 0.9
                },
                reason: "template policy adjusted response"
            })
        };
        const { orchestrate } = await loadOrchestrator({
            preCheckStrategy: createNotHandledStrategy("preCheckStrategy"),
            stateStrategy: createNotHandledStrategy("stateStrategy"),
            ruleBasedStrategy: {
                name: "ruleBasedStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: true,
                    decision: {
                        action: "reply",
                        source: "rule_engine",
                        response: {
                            type: "text",
                            text: "Original answer"
                        },
                        nextState: null,
                        handoffRequired: false,
                        reason: "rule hit",
                        confidence: 0.9
                    },
                    reason: "rule hit"
                })
            },
            faqStrategy: createNotHandledStrategy("faqStrategy"),
            ragStrategy: createNotHandledStrategy("ragStrategy"),
            llmStrategy: createNotHandledStrategy("llmStrategy"),
            templatePolicyEvaluator,
            humanHandoffStrategy: createNotHandledStrategy(
                "humanHandoffStrategy"
            )
        });

        const decision = await orchestrate(createInput());

        expect(templatePolicyEvaluator.execute).toHaveBeenCalledWith(
            expect.objectContaining({
                candidateDecision: expect.objectContaining({
                    reason: "rule hit"
                })
            })
        );
        expect(decision.response.text).toBe("Template-safe answer");
        expect(decision.source).toBe("template_engine");
    });

    test("supports adding a new strategy without changing the orchestrator", async () => {
        const {
            createConversationOrchestrator
        } = await loadOrchestratorFactory();
        const {
            createStrategyRegistry
        } = require("../../../src/orchestrator/routing/strategyRegistry");
        const {
            ROUTE_ACTIONS
        } = require("../../../src/orchestrator/routing/routeDecisionContract");
        const customStrategy = {
            name: "customStrategy",
            execute: jest.fn().mockResolvedValue({
                handled: true,
                decision: {
                    action: "reply",
                    source: "llm",
                    response: {
                        type: "text",
                        text: "Custom strategy reply"
                    },
                    nextState: null,
                    handoffRequired: false,
                    reason: "custom handled",
                    confidence: 0.88
                },
                reason: "custom handled"
            })
        };
        const registry = createStrategyRegistry({
            preCheckStrategy: {
                name: "preCheckStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "pre-checks passed"
                })
            },
            templatePolicyEvaluator: {
                name: "templatePolicyEvaluator",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "template skipped"
                })
            },
            customStrategy
        });
        const customRoutingEngine = {
            getNextRoute: jest.fn().mockReturnValue({
                action: ROUTE_ACTIONS.RUN_STRATEGY,
                nextStrategy: "customStrategy",
                reason: "custom strategy selected",
                metadata: {
                    selectedStrategy: "customStrategy",
                    previousStrategy: null,
                    fallbackReason: null,
                    hopCount: 0,
                    ruleName: "custom_strategy_selected"
                }
            })
        };
        const { orchestrate } = createConversationOrchestrator({
            strategyRegistry: registry,
            routingEngine: customRoutingEngine
        });

        const decision = await orchestrate(createInput());

        expect(customRoutingEngine.getNextRoute).toHaveBeenCalledTimes(1);
        expect(customStrategy.execute).toHaveBeenCalledTimes(1);
        expect(decision.response.text).toBe("Custom strategy reply");
    });

    test("returns an error decision when a strategy throws unexpectedly", async () => {
        const { orchestrate } = await loadOrchestrator({
            preCheckStrategy: {
                name: "preCheckStrategy",
                execute: jest.fn().mockRejectedValue(new Error("boom"))
            },
            stateStrategy: {
                name: "stateStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "state skipped"
                })
            },
            ruleBasedStrategy: {
                name: "ruleBasedStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "rule skipped"
                })
            },
            faqStrategy: {
                name: "faqStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "faq skipped"
                })
            },
            ragStrategy: {
                name: "ragStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "rag skipped"
                })
            },
            llmStrategy: {
                name: "llmStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "llm skipped"
                })
            },
            templatePolicyEvaluator: {
                name: "templatePolicyEvaluator",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "template skipped"
                })
            },
            humanHandoffStrategy: {
                name: "humanHandoffStrategy",
                execute: jest.fn().mockResolvedValue({
                    handled: false,
                    reason: "handoff skipped"
                })
            }
        });

        const decision = await orchestrate(createInput());

        expect(decision.action).toBe("error");
        expect(decision.reason).toBe("orchestration pipeline failed unexpectedly");
    });
});
