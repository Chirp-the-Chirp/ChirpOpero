"use strict";

function createRawTextMessage(overrides = {}) {
    return {
        from: "94770000001",
        id: "wamid.text.001",
        timestamp: "1774078799",
        text: { body: "Hello" },
        type: "text",
        ...overrides
    };
}

function createInteractiveButtonMessage(overrides = {}) {
    return {
        from: "94770000002",
        id: "wamid.interactive.001",
        timestamp: "1774078800",
        type: "interactive",
        interactive: {
            button_reply: {
                id: "reply-help",
                title: "Help"
            }
        },
        ...overrides
    };
}

function createRawStatus(overrides = {}) {
    return {
        id: "wamid.status.001",
        status: "delivered",
        recipient_id: "94770000001",
        timestamp: "1774078801",
        ...overrides
    };
}

function createWebhookMessagePayload(overrides = {}) {
    return {
        object: "whatsapp_business_account",
        entry: [
            {
                changes: [
                    {
                        value: {
                            metadata: {
                                phone_number_id: "1234567890"
                            },
                            messages: [createRawTextMessage()]
                        }
                    }
                ]
            }
        ],
        ...overrides
    };
}

function createWebhookStatusPayload(overrides = {}) {
    return {
        object: "whatsapp_business_account",
        entry: [
            {
                changes: [
                    {
                        value: {
                            metadata: {
                                phone_number_id: "1234567890"
                            },
                            statuses: [createRawStatus()]
                        }
                    }
                ]
            }
        ],
        ...overrides
    };
}

function createConversationContext(overrides = {}) {
    return {
        state: "active",
        lastRoute: "rule_engine",
        lastHandledAt: "2026-03-27T10:00:00.000Z",
        ...overrides
    };
}

module.exports = {
    createRawTextMessage,
    createInteractiveButtonMessage,
    createRawStatus,
    createWebhookMessagePayload,
    createWebhookStatusPayload,
    createConversationContext
};
