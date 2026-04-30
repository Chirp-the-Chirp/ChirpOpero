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
        }, {
            previousStrategy: STRATEGY_IDS.STATE,
            hopCount: 2
        });

        expect(result).toEqual({
            strategyId: STRATEGY_IDS.RULE_BASED,
            outcome: STRATEGY_OUTCOMES.RESPOND,
            decision: replyDecision,
            reason: "rule handled",
            metadata: {
                selectedStrategy: STRATEGY_IDS.RULE_BASED,
                previousStrategy: STRATEGY_IDS.STATE,
                hopCount: 2,
                responseSource: "rule_engine",
                fallbackReason: null
            }
        });
    });

    test("adapts not-handled strategy results to continue outcomes", () => {
        const result = adaptStrategyResult(STRATEGY_IDS.STATE, {
            handled: false,
            reason: "no active state"
        }, {
            previousStrategy: STRATEGY_IDS.PRE_CHECK,
            hopCount: 1
        });

        expect(result).toEqual({
            strategyId: STRATEGY_IDS.STATE,
            outcome: STRATEGY_OUTCOMES.CONTINUE,
            decision: null,
            reason: "no active state",
            metadata: {
                selectedStrategy: STRATEGY_IDS.STATE,
                previousStrategy: STRATEGY_IDS.PRE_CHECK,
                hopCount: 1,
                responseSource: null,
                fallbackReason: null
            }
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
            metadata: {
                selectedStrategy: STRATEGY_IDS.LLM,
                previousStrategy: null,
                hopCount: null,
                responseSource: null,
                fallbackReason: "llm unavailable"
            }
        });
    });
});
