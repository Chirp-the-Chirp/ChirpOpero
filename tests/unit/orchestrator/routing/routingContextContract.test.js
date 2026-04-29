"use strict";

const {
    createRoutingContext,
    validateRoutingContext
} = require("../../../../src/orchestrator/routing/routingContextContract");

describe("routingContextContract", () => {
    // These tests protect the stable context shape consumed by the routing engine.

    function createOrchestratorContext() {
        return {
            message: {
                messageId: "wamid.text.001",
                from: "94770000001",
                type: "text",
                text: "hello",
                timestamp: "1774078799"
            },
            conversation: {
                state: null,
                lastRoute: null,
                lastHandledAt: null
            },
            customer: {
                customerId: "94770000001"
            },
            metadata: {
                channel: "whatsapp"
            }
        };
    }

    test("builds routing context from normalized orchestrator context", () => {
        const context = createRoutingContext(createOrchestratorContext(), {
            visitedStrategies: ["stateStrategy"],
            hopCount: 1
        });

        expect(context).toMatchObject({
            message: expect.objectContaining({
                messageId: "wamid.text.001"
            }),
            conversation: expect.objectContaining({
                state: null
            }),
            customer: expect.objectContaining({
                customerId: "94770000001"
            }),
            metadata: expect.objectContaining({
                channel: "whatsapp"
            }),
            previousResult: null,
            visitedStrategies: ["stateStrategy"],
            hopCount: 1
        });
        expect(validateRoutingContext(context)).toEqual({ valid: true });
    });

    test("rejects malformed routing context", () => {
        expect(
            validateRoutingContext({
                message: {},
                conversation: {},
                customer: {},
                metadata: {},
                visitedStrategies: "stateStrategy",
                hopCount: 0,
                previousResult: null
            })
        ).toEqual({
            valid: false,
            reason: "routing context visitedStrategies must be an array"
        });
    });
});
