"use strict";

jest.mock("../../../src/config/env", () => ({
    accessToken: "test-access-token"
}));

jest.mock("../../../src/utils/logger", () => ({
    createLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }))
}));

const mockApiCall = jest.fn();

jest.mock("facebook-nodejs-business-sdk", () => ({
    FacebookAdsApi: jest.fn().mockImplementation(() => ({
        call: mockApiCall
    }))
}));

const GraphApiService = require("../../../src/services/graph-api.service");

describe("GraphApiService", () => {
    // These tests verify the request payloads we send to the Meta SDK wrapper.

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("messageWithText marks inbound messages as read before sending the reply", async () => {
        mockApiCall
            .mockResolvedValueOnce({ success: true })
            .mockResolvedValueOnce({ messages: [{ id: "wamid.reply.001" }] });

        const response = await GraphApiService.messageWithText(
            "wamid.inbound.001",
            "1234567890",
            "94770000001",
            "Hello from bot"
        );

        expect(mockApiCall).toHaveBeenNthCalledWith(
            1,
            "POST",
            ["1234567890", "messages"],
            {
                messaging_product: "whatsapp",
                status: "read",
                message_id: "wamid.inbound.001",
                typing_indicator: {
                    type: "text"
                }
            }
        );
        expect(mockApiCall).toHaveBeenNthCalledWith(
            2,
            "POST",
            ["1234567890", "messages"],
            {
                messaging_product: "whatsapp",
                to: "94770000001",
                type: "text",
                text: {
                    body: "Hello from bot"
                }
            }
        );
        expect(response).toEqual({ messages: [{ id: "wamid.reply.001" }] });
    });

    test("messageWithInteractiveReply builds button payloads correctly", async () => {
        mockApiCall
            .mockResolvedValueOnce({ success: true })
            .mockResolvedValueOnce({ messages: [{ id: "wamid.reply.002" }] });

        await GraphApiService.messageWithInteractiveReply(
            "wamid.inbound.002",
            "1234567890",
            "94770000001",
            "Choose an option",
            [
                { id: "option-1", title: "Option 1" },
                { id: "option-2", title: "Option 2" }
            ]
        );

        expect(mockApiCall).toHaveBeenNthCalledWith(
            2,
            "POST",
            ["1234567890", "messages"],
            {
                messaging_product: "whatsapp",
                to: "94770000001",
                type: "interactive",
                interactive: {
                    type: "button",
                    body: {
                        text: "Choose an option"
                    },
                    action: {
                        buttons: [
                            {
                                type: "reply",
                                reply: {
                                    id: "option-1",
                                    title: "Option 1"
                                }
                            },
                            {
                                type: "reply",
                                reply: {
                                    id: "option-2",
                                    title: "Option 2"
                                }
                            }
                        ]
                    }
                }
            }
        );
    });

    test("propagates SDK errors to the caller", async () => {
        mockApiCall.mockRejectedValue(new Error("meta api failed"));

        await expect(
            GraphApiService.messageWithText(
                "wamid.inbound.003",
                "1234567890",
                "94770000001",
                "Hello from bot"
            )
        ).rejects.toThrow("meta api failed");
    });
});
