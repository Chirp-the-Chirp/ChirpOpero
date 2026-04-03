"use strict";

const Message = require("../../../src/models/message.model");
const {
    createRawTextMessage,
    createInteractiveButtonMessage
} = require("../fixtures/sampleData");

describe("Message model", () => {
    // These tests protect the parsing contract used by the controller/orchestrator flow.

    test("parses a plain text message into the normalized message shape", () => {
        const message = new Message(createRawTextMessage());

        expect(message).toEqual({
            id: "wamid.text.001",
            senderPhoneNumber: "94770000001",
            type: "text",
            content: "Hello",
            eventTimestamp: 1774078799
        });
    });

    test("extracts interactive button reply details", () => {
        const message = new Message(createInteractiveButtonMessage());

        expect(message.type).toBe("reply-help");
        expect(message.content).toBe("Help");
        expect(message.senderPhoneNumber).toBe("94770000002");
    });

    test("falls back to captions and file names for supported media payloads", () => {
        const imageMessage = new Message(
            createRawTextMessage({
                type: "image",
                text: undefined,
                image: {
                    caption: "Product photo"
                }
            })
        );
        const documentMessage = new Message(
            createRawTextMessage({
                type: "document",
                text: undefined,
                document: {
                    filename: "menu.pdf"
                }
            })
        );

        expect(imageMessage.content).toBe("Product photo");
        expect(documentMessage.content).toBe("menu.pdf");
    });

    test("returns safe defaults when type or timestamp are invalid", () => {
        const message = new Message({
            from: "94770000003",
            id: "wamid.invalid.001",
            type: null,
            timestamp: "not-a-number"
        });

        expect(message.type).toBe("unknown");
        expect(message.content).toBeNull();
        expect(message.eventTimestamp).toBeNull();
    });
});
