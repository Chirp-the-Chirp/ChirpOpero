"use strict";

class Message {
    constructor(rawMessage) {
        this.id = rawMessage.id;
        this.senderPhoneNumber = rawMessage.from;
        this.type = Message.extractType(rawMessage);
        this.content = Message.extractContent(rawMessage);
        this.eventTimestamp = Message.parseTimestamp(rawMessage.timestamp);
    }

    static extractType(rawMessage) {
        const rawType = rawMessage.type;

        if ( rawType === "interactive" && rawMessage.interactive && rawMessage.interactive.button_reply ) {
            return rawMessage.interactive.button_reply.id;
        }

        return typeof rawType === "string" ? rawType : "unknown";
    }

    static extractContent(rawMessage) {
        if (!rawMessage) {
            return null;
        }

        if (rawMessage.text && rawMessage.text.body) {
            return rawMessage.text.body;
        }

        if (rawMessage.interactive) {
            const interactive = rawMessage.interactive;

            if (interactive.button_reply && interactive.button_reply.title) {
                return interactive.button_reply.title;
            }

            if (interactive.list_reply) {
                return (
                    interactive.list_reply.title ||
                    interactive.list_reply.description ||
                    interactive.list_reply.id ||
                    null
                );
            }
        }

        if (rawMessage.image && rawMessage.image.caption) {
            return rawMessage.image.caption;
        }

        if (rawMessage.document && rawMessage.document.filename) {
            return rawMessage.document.filename;
        }

        if (rawMessage.location) {
            return rawMessage.location.name || rawMessage.location.address || null;
        }

        if (rawMessage.audio) {
            return "Audio message";
        }

        if (rawMessage.video) {
            return "Video message";
        }

        return null;
    }

    static parseTimestamp(timestamp) {
        if (!timestamp) {
            return null;
        }

        const parsed = Number(timestamp);

        if (Number.isNaN(parsed)) {
            return null;
        }

        return parsed;
    }
}

module.exports = Message;
