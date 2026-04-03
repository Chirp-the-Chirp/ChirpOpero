"use strict";

const {
    findFlowByState,
    getStateConfig,
    resolveStateHandler,
    matchFlowByTrigger
} = require("../../../../src/orchestrator/flows/flowRegistry.helpers");
const flowRegistry = require("../../../../src/orchestrator/flows/flowRegistry");
const {
    CONVERSATION_STATES
} = require("../../../../src/orchestrator/conversationStateTypes");

describe("flowRegistry helpers", () => {
    // These tests cover safe state and trigger resolution against the shared registry.

    test("finds the owning flow by state", () => {
        const flow = findFlowByState(CONVERSATION_STATES.WAITING_FOR_ORDER_ID);

        expect(flow).toEqual(
            expect.objectContaining({
                id: "orderFlow"
            })
        );
    });

    test("returns the state config for a known state", () => {
        const stateConfig = getStateConfig(CONVERSATION_STATES.WAITING_FOR_ORDER_ID);

        expect(stateConfig).toEqual({
            handler: "handleWaitingForOrderId"
        });
    });

    test("matches a flow by keyword trigger", () => {
        const flow = matchFlowByTrigger("order");

        expect(flow).toEqual(flowRegistry.orderFlow);
    });

    test("handles unknown triggers safely", () => {
        expect(matchFlowByTrigger("unknown keyword")).toBeNull();
    });

    test("ignores malformed registry entries safely", () => {
        const malformedRegistry = {
            badFlow: {
                id: "badFlow",
                trigger: {
                    type: "keyword",
                    values: "order"
                }
            }
        };

        expect(matchFlowByTrigger("order", malformedRegistry)).toBeNull();
    });

    test("returns null safely for unknown states", () => {
        expect(findFlowByState("UNKNOWN_STATE")).toBeNull();
        expect(getStateConfig("UNKNOWN_STATE")).toBeNull();
        expect(resolveStateHandler("UNKNOWN_STATE")).toBeNull();
    });

    test("resolves the registered state handler for known states", () => {
        const handler = resolveStateHandler(
            CONVERSATION_STATES.WAITING_FOR_ORDER_ID
        );

        expect(typeof handler).toBe("function");
    });
});
