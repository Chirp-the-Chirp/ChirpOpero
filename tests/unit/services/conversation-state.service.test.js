"use strict";

jest.mock("../../../src/services/redis.service", () => ({
    getJson: jest.fn(),
    setJson: jest.fn()
}));

jest.mock("../../../src/utils/logger", () => ({
    createLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

const RedisService = require("../../../src/services/redis.service");
const ConversationStateService = require("../../../src/services/conversation-state.service");

describe("ConversationStateService", () => {
    // These tests cover the state persistence contract shared with the orchestrator.

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("returns the default state when no customer id is provided", async () => {
        const state = await ConversationStateService.getConversationState(null);

        expect(state).toEqual({
            state: null,
            lastRoute: null,
            lastHandledAt: null,
            lastMessageAt: null,
            lastMessageId: null,
            lastMessageType: null,
            updatedAt: null
        });
        expect(RedisService.getJson).not.toHaveBeenCalled();
    });

    test("normalizes stored state from Redis", async () => {
        RedisService.getJson.mockResolvedValue({
            state: "collecting_details",
            lastRoute: "rule_engine"
        });

        const state = await ConversationStateService.getConversationState(
            "94770000001"
        );

        expect(RedisService.getJson).toHaveBeenCalledWith(
            "conversation_state:94770000001"
        );
        expect(state).toMatchObject({
            state: "collecting_details",
            lastRoute: "rule_engine",
            lastHandledAt: null
        });
    });

    test("updates and persists merged conversation state", async () => {
        RedisService.getJson.mockResolvedValue({
            state: "active",
            lastRoute: "rule_engine"
        });

        const state = await ConversationStateService.updateConversationState(
            "94770000001",
            {
                lastHandledAt: "2026-03-27T10:00:00.000Z"
            }
        );

        expect(RedisService.setJson).toHaveBeenCalledWith(
            "conversation_state:94770000001",
            expect.objectContaining({
                state: "active",
                lastRoute: "rule_engine",
                lastHandledAt: "2026-03-27T10:00:00.000Z",
                updatedAt: expect.any(String)
            })
        );
        expect(state.updatedAt).toEqual(expect.any(String));
    });

    test("returns only orchestrator-facing context fields", async () => {
        RedisService.getJson.mockResolvedValue({
            state: "active",
            lastRoute: "faq",
            lastHandledAt: "2026-03-27T11:00:00.000Z",
            lastMessageId: "wamid.text.001"
        });

        const context = await ConversationStateService.getContextForOrchestrator(
            "94770000001"
        );

        expect(context).toEqual({
            state: "active",
            lastRoute: "faq",
            lastHandledAt: "2026-03-27T11:00:00.000Z"
        });
    });

    test("records inbound message metadata using normalized timestamps", async () => {
        RedisService.getJson.mockResolvedValue(null);

        await ConversationStateService.recordIncomingMessage({
            id: "wamid.text.001",
            senderPhoneNumber: "94770000001",
            type: "text",
            eventTimestamp: 1774078799
        });

        expect(RedisService.setJson).toHaveBeenCalledWith(
            "conversation_state:94770000001",
            expect.objectContaining({
                lastMessageAt: "2026-03-21T07:39:59.000Z",
                lastMessageId: "wamid.text.001",
                lastMessageType: "text"
            })
        );
    });

    test("records interaction results using nextState when provided", async () => {
        RedisService.getJson.mockResolvedValue({
            state: "active",
            lastRoute: "rule_engine"
        });

        await ConversationStateService.recordInteractionResult("94770000001", {
            nextState: "awaiting_reply",
            source: "llm"
        });

        expect(RedisService.setJson).toHaveBeenCalledWith(
            "conversation_state:94770000001",
            expect.objectContaining({
                state: "awaiting_reply",
                lastRoute: "llm",
                lastHandledAt: expect.any(String)
            })
        );
    });

    test("records status updates without orchestrator-specific fields", async () => {
        RedisService.getJson.mockResolvedValue(null);

        await ConversationStateService.recordStatusUpdate("94770000001", {
            status: "delivered"
        });

        expect(RedisService.setJson).toHaveBeenCalledWith(
            "conversation_state:94770000001",
            expect.objectContaining({
                lastRoute: "delivered",
                lastHandledAt: expect.any(String)
            })
        );
    });
});
