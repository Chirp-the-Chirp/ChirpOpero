"use strict";

describe("ConversationOrchestrator pipeline", () => {
    // These tests verify strategy ordering, short-circuiting, fallback, and error handling.

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

    test("stops at the first handled strategy in pipeline order", async () => {
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
        expect(stateStrategy.execute).toHaveBeenCalledTimes(1);
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

        const decision = await orchestrate(createInput());

        expect(preCheckStrategy.execute).toHaveBeenCalledTimes(1);
        expect(stateStrategy.execute).toHaveBeenCalledTimes(1);
        expect(ruleBasedStrategy.execute).not.toHaveBeenCalled();
        expect(decision.response.text).toBe("Checking your order...");
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
