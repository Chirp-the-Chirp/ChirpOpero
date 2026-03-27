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
        const preCheckStrategy = jest.fn().mockResolvedValue({ handled: false });
        const stateStrategy = jest.fn().mockResolvedValue({ handled: false });
        const ruleBasedStrategy = jest.fn().mockResolvedValue({
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
            }
        });
        const faqStrategy = jest.fn().mockResolvedValue({ handled: false });

        const { orchestrate } = await loadOrchestrator({
            preCheckStrategy,
            stateStrategy,
            ruleBasedStrategy,
            faqStrategy,
            ragStrategy: jest.fn().mockResolvedValue({ handled: false }),
            llmStrategy: jest.fn().mockResolvedValue({ handled: false }),
            templatePolicyEvaluator: jest.fn().mockResolvedValue({ handled: false }),
            humanHandoffStrategy: jest.fn().mockResolvedValue({ handled: false })
        });

        const decision = await orchestrate(createInput());

        expect(preCheckStrategy).toHaveBeenCalledTimes(1);
        expect(stateStrategy).toHaveBeenCalledTimes(1);
        expect(ruleBasedStrategy).toHaveBeenCalledTimes(1);
        expect(faqStrategy).not.toHaveBeenCalled();
        expect(decision.response.text).toBe("Handled by rule strategy");
    });

    test("returns fallback when no strategy handles the message", async () => {
        const notHandled = jest.fn().mockResolvedValue({ handled: false });
        const { orchestrate } = await loadOrchestrator({
            preCheckStrategy: notHandled,
            stateStrategy: notHandled,
            ruleBasedStrategy: notHandled,
            faqStrategy: notHandled,
            ragStrategy: notHandled,
            llmStrategy: notHandled,
            templatePolicyEvaluator: notHandled,
            humanHandoffStrategy: notHandled
        });

        const decision = await orchestrate(createInput());

        expect(decision.action).toBe("reply");
        expect(decision.reason).toBe("fallback response");
    });

    test("returns an error decision when a strategy throws unexpectedly", async () => {
        const { orchestrate } = await loadOrchestrator({
            preCheckStrategy: jest.fn().mockRejectedValue(new Error("boom")),
            stateStrategy: jest.fn().mockResolvedValue({ handled: false }),
            ruleBasedStrategy: jest.fn().mockResolvedValue({ handled: false }),
            faqStrategy: jest.fn().mockResolvedValue({ handled: false }),
            ragStrategy: jest.fn().mockResolvedValue({ handled: false }),
            llmStrategy: jest.fn().mockResolvedValue({ handled: false }),
            templatePolicyEvaluator: jest.fn().mockResolvedValue({ handled: false }),
            humanHandoffStrategy: jest.fn().mockResolvedValue({ handled: false })
        });

        const decision = await orchestrate(createInput());

        expect(decision.action).toBe("error");
        expect(decision.reason).toBe("orchestration pipeline failed unexpectedly");
    });
});
