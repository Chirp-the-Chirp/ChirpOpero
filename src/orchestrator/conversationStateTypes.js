"use strict";

/**
 * Shared conversation state identifiers used by active-flow strategies.
 * Keeping them centralized avoids string drift between persistence and routing.
 */

const CONVERSATION_STATES = Object.freeze({
    WAITING_FOR_ORDER_ID: "WAITING_FOR_ORDER_ID"
});

module.exports = {
    CONVERSATION_STATES
};
