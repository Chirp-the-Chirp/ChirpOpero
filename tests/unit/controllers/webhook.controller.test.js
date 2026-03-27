"use strict";

jest.mock("../../../src/config/env", () => ({
    verifyToken: "test-verify-token"
}));

jest.mock("../../../src/orchestrator/conversationOrchestrator", () => ({
    orchestrate: jest.fn()
}));

jest.mock("../../../src/services/graph-api.service", () => ({
    messageWithText: jest.fn()
}));

jest.mock("../../../src/services/conversation-state.service", () => ({
    recordIncomingMessage: jest.fn(),
    getContextForOrchestrator: jest.fn(),
    recordInteractionResult: jest.fn(),
    recordStatusUpdate: jest.fn()
}));

jest.mock("../../../src/utils/logger", () => ({
    createLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

const WebhookController = require("../../../src/controllers/webhook.controller");
const { orchestrate } = require("../../../src/orchestrator/conversationOrchestrator");
const GraphApiService = require("../../../src/services/graph-api.service");
const ConversationStateService = require("../../../src/services/conversation-state.service");
const {
    createRawStatus,
    createRawTextMessage,
    createWebhookMessagePayload,
    createWebhookStatusPayload,
    createConversationContext
} = require("../fixtures/sampleData");

describe("WebhookController", () => {
    // These tests focus on HTTP-layer coordination and dependency wiring.

    beforeEach(() => {
        jest.clearAllMocks();

        ConversationStateService.getContextForOrchestrator.mockResolvedValue(
            createConversationContext()
        );
        GraphApiService.messageWithText.mockResolvedValue({
            messages: [{ id: "wamid.reply.001" }]
        });
        ConversationStateService.recordIncomingMessage.mockResolvedValue();
        ConversationStateService.recordInteractionResult.mockResolvedValue();
        ConversationStateService.recordStatusUpdate.mockResolvedValue();
    });

    function createResponse() {
        return {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
            sendStatus: jest.fn()
        };
    }

    test("verify returns challenge for valid subscription requests", () => {
        const req = {
            query: {
                "hub.mode": "subscribe",
                "hub.verify_token": "test-verify-token",
                "hub.challenge": "challenge-token"
            }
        };
        const res = createResponse();

        WebhookController.verify(req, res);

        expect(res.send).toHaveBeenCalledWith("challenge-token");
    });

    test("verify rejects invalid subscription requests", () => {
        const req = {
            query: {
                "hub.mode": "subscribe",
                "hub.verify_token": "wrong-token"
            }
        };
        const res = createResponse();

        WebhookController.verify(req, res);

        expect(res.sendStatus).toHaveBeenCalledWith(403);
    });

    test("handleMessage loads state, calls orchestrator, sends reply, and stores result", async () => {
        const rawMessage = createRawTextMessage();
        const decision = {
            action: "reply",
            response: {
                type: "text",
                text: "Hello from orchestrator"
            },
            source: "rule_engine",
            nextState: "engaged",
            handoffRequired: false,
            reason: "matched greeting",
            confidence: 0.9
        };
        orchestrate.mockResolvedValue(decision);

        await WebhookController.handleMessage("1234567890", rawMessage);

        expect(ConversationStateService.recordIncomingMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                id: rawMessage.id,
                senderPhoneNumber: rawMessage.from,
                content: rawMessage.text.body
            })
        );
        expect(ConversationStateService.getContextForOrchestrator).toHaveBeenCalledWith(
            rawMessage.from
        );
        expect(orchestrate).toHaveBeenCalledWith({
            message: {
                messageId: rawMessage.id,
                from: rawMessage.from,
                type: "text",
                text: rawMessage.text.body,
                timestamp: rawMessage.timestamp
            },
            conversation: createConversationContext(),
            customer: {
                customerId: rawMessage.from
            },
            metadata: {
                channel: "whatsapp"
            }
        });
        expect(GraphApiService.messageWithText).toHaveBeenCalledWith(
            rawMessage.id,
            "1234567890",
            rawMessage.from,
            "Hello from orchestrator"
        );
        expect(ConversationStateService.recordInteractionResult).toHaveBeenCalledWith(
            rawMessage.from,
            decision
        );
    });

    test("handleMessage skips WhatsApp send when the decision is not a text reply", async () => {
        orchestrate.mockResolvedValue({
            action: "no_reply",
            response: null,
            source: "rule_engine",
            nextState: null,
            handoffRequired: false,
            reason: "no response needed",
            confidence: 0.8
        });

        await WebhookController.handleMessage("1234567890", createRawTextMessage());

        expect(GraphApiService.messageWithText).not.toHaveBeenCalled();
        expect(
            ConversationStateService.recordInteractionResult
        ).toHaveBeenCalled();
    });

    test("handleStatus persists customer status updates", async () => {
        const rawStatus = createRawStatus();

        await WebhookController.handleStatus("1234567890", rawStatus);

        expect(ConversationStateService.recordStatusUpdate).toHaveBeenCalledWith(
            rawStatus.recipient_id,
            rawStatus
        );
    });

    test("handleWebhook routes message and status events to the correct handlers", async () => {
        const messageSpy = jest
            .spyOn(WebhookController, "handleMessage")
            .mockResolvedValue();
        const statusSpy = jest
            .spyOn(WebhookController, "handleStatus")
            .mockResolvedValue();
        const req = {
            body: {
                object: "whatsapp_business_account",
                entry: [
                    createWebhookMessagePayload().entry[0],
                    createWebhookStatusPayload().entry[0]
                ]
            }
        };
        const res = createResponse();

        await WebhookController.handleWebhook(req, res);

        expect(messageSpy).toHaveBeenCalledWith(
            "1234567890",
            expect.objectContaining({
                id: "wamid.text.001"
            })
        );
        expect(statusSpy).toHaveBeenCalledWith(
            "1234567890",
            expect.objectContaining({
                id: "wamid.status.001"
            })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith("EVENT_RECEIVED");
    });

    test("handleWebhook returns 500 when an internal handler fails", async () => {
        jest.spyOn(WebhookController, "handleMessage").mockRejectedValue(
            new Error("message failure")
        );
        const req = {
            body: createWebhookMessagePayload()
        };
        const res = createResponse();

        await WebhookController.handleWebhook(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: "Failed to process webhook event"
        });
    });
});
