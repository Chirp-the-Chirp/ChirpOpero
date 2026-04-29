"use strict";

const {
    STRATEGY_OUTCOMES,
    adaptStrategyResult,
    createRoutingStrategyResult,
    validateRoutingStrategyResult
} = require("../../../../src/orchestrator/routing/routingStrategyResultContract");
const {
    STRATEGY_IDS
} = require("../../../../src/orchestrator/routing/strategyIdentifiers");

describe("routingStrategyResultContract", () => {
    // These tests verify the adapter that lets old strategies work with routing outcomes.

    const replyDecision = {
        action: "reply",
        source: "rule_engine",
        response: {
            type: "text",
            text: "Hello"
        },
        nextState: null,
        handoffRequired: false,
        reason: "matched greeting",
        confidence: 0.9
    };

    test("adapts handled strategy results to respond outcomes", () => {
        const result = adaptStrategyResult(STRATEGY_IDS.RULE_BASED, {
            handled: true,
            decision: replyDecision,
            reason: "rule handled"
        });

        expect(result).toEqual({
            strategyId: STRATEGY_IDS.RULE_BASED,
            outcome: STRATEGY_OUTCOMES.RESPOND,
            decision: replyDecision,
            reason: "rule handled",
            metadata: {}
        });
    });

    test("adapts not-handled strategy results to continue outcomes", () => {
        const result = adaptStrategyResult(STRATEGY_IDS.STATE, {
            handled: false,
            reason: "no active state"
        });

        expect(result).toEqual({
            strategyId: STRATEGY_IDS.STATE,
            outcome: STRATEGY_OUTCOMES.CONTINUE,
            decision: null,
            reason: "no active state",
            metadata: {}
        });
    });

    test("rejects respond outcomes without a decision", () => {
        expect(
            validateRoutingStrategyResult({
                strategyId: STRATEGY_IDS.RULE_BASED,
                outcome: STRATEGY_OUTCOMES.RESPOND,
                decision: null,
                reason: "bad result",
                metadata: {}
            })
        ).toEqual({
            valid: false,
            reason: "respond routing result requires decision"
        });
    });

    test("creates fallback routing results for future strategy integrations", () => {
        const result = createRoutingStrategyResult(
            STRATEGY_IDS.LLM,
            STRATEGY_OUTCOMES.FALLBACK,
            {
                reason: "llm unavailable"
            }
        );

        expect(result).toEqual({
            strategyId: STRATEGY_IDS.LLM,
            outcome: STRATEGY_OUTCOMES.FALLBACK,
            decision: null,
            reason: "llm unavailable",
            metadata: {}
        });
    });
});
