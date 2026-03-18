"use strict";

class Message {
    constructor(rawMessage) {
        this.id = rawMessage.id;
        this.senderPhoneNumber = rawMessage.from;

        const rawType = rawMessage.type;

        if (
        rawType === "interactive" &&
        rawMessage.interactive &&
        rawMessage.interactive.button_reply
        ) {
        this.type = rawMessage.interactive.button_reply.id;
        } else {
        this.type = "unknown";
        }
    }
}

module.exports = Message;