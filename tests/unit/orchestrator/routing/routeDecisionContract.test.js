"use strict";

const {
    ROUTE_ACTIONS,
    createStrategyRoute,
    createFallbackRoute,
    validateRouteDecision
} = require("../../../../src/orchestrator/routing/routeDecisionContract");
const {
    STRATEGY_IDS
} = require("../../../../src/orchestrator/routing/strategyIdentifiers");

describe("routeDecisionContract", () => {
    // These tests keep routing-engine decisions explicit and safe to execute.

    test("creates a valid strategy route", () => {
        const route = createStrategyRoute(
            STRATEGY_IDS.RULE_BASED,
            "route to deterministic rules"
        );

        expect(route).toEqual({
            action: ROUTE_ACTIONS.RUN_STRATEGY,
            nextStrategy: STRATEGY_IDS.RULE_BASED,
            reason: "route to deterministic rules",
            metadata: {
                selectedStrategy: STRATEGY_IDS.RULE_BASED
            }
        });
    });

    test("creates a valid fallback route", () => {
        const route = createFallbackRoute("nothing handled the message");

        expect(route).toEqual({
            action: ROUTE_ACTIONS.FALLBACK,
            nextStrategy: null,
            reason: "nothing handled the message",
            metadata: {
                fallbackReason: "nothing handled the message"
            }
        });
    });

    test("allows arbitrary registered strategy keys", () => {
        expect(
            validateRouteDecision(
                createStrategyRoute(
                    "customStrategy",
                    "route to custom strategy"
                )
            )
        ).toEqual({ valid: true });
    });

    test("rejects empty strategy ids", () => {
        expect(
            validateRouteDecision({
                action: ROUTE_ACTIONS.RUN_STRATEGY,
                nextStrategy: "",
                reason: "bad route",
                metadata: {}
            })
        ).toEqual({
            valid: false,
            reason: "route decision strategy is invalid"
        });
    });
});
