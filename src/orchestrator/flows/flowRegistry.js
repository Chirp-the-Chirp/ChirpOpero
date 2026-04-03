"use strict";

const { CONVERSATION_STATES } = require("../conversationStateTypes");

/**
 * Shared flow registry.
 * This keeps flow metadata in one place so both flow-start strategies and
 * flow-continuation strategies can rely on the same definitions.
 */
const flowRegistry = Object.freeze({
    orderFlow: {
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
    }
});

module.exports = flowRegistry;
