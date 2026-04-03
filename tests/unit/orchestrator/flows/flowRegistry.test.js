"use strict";

const flowRegistry = require("../../../../src/orchestrator/flows/flowRegistry");
const {
    CONVERSATION_STATES
} = require("../../../../src/orchestrator/conversationStateTypes");

describe("flowRegistry", () => {
    // These tests lock down the shared registry shape used by flow start and continuation logic.

    test("defines the order flow with trigger, entry, and state mapping", () => {
        expect(flowRegistry.orderFlow).toEqual({
            id: "orderFlow",
            trigger: {
                type: "keyword",
                values: ["order"]
            },
            entry: {
                state: CONVERSATION_STATES.WAITING_FOR_ORDER_ID,
                response: {
                    type: "text",
                    text: "Please provide your order ID"
                }
            },
            states: {
                [CONVERSATION_STATES.WAITING_FOR_ORDER_ID]: {
                    handler: "handleWaitingForOrderId"
                }
            }
        });
    });

    test("keeps the entry state aligned with a registered flow state", () => {
        expect(
            flowRegistry.orderFlow.states[flowRegistry.orderFlow.entry.state]
        ).toEqual({
            handler: "handleWaitingForOrderId"
        });
    });
});
