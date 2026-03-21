"use strict";

const env = require("../config/env");
const ConversationService = require("../services/conversation.service");
const { createLogger } = require("../utils/logger");

const logger = createLogger("WebhookController");

class WebhookController {
    static verify(req, res) {
        logger.debug("Webhook verification request received");

        if (
            req.query["hub.mode"] !== "subscribe" ||
            req.query["hub.verify_token"] !== env.verifyToken
        ) {
            return res.sendStatus(403);
        }

        return res.send(req.query["hub.challenge"]);
    }

    static async handleWebhook(req, res) {

        try {
            if (req.body.object === "whatsapp_business_account") {
                for (const entry of req.body.entry || []) {
                    for (const change of entry.changes || []) {
                        const value = change.value;
                        if (!value) {
                            continue;
                        }

                        const senderPhoneNumberId = value.metadata.phone_number_id;

                        if (value.statuses) {
                            for (const status of value.statuses) {
                                await ConversationService.handleStatus(senderPhoneNumberId, status);
                            }
                        }

                        if (value.messages) {
                            for (const rawMessage of value.messages) {
                                await ConversationService.handleMessage(senderPhoneNumberId, rawMessage);
                            }
                        }
                    }
                }
            }

            return res.status(200).send("EVENT_RECEIVED");
        } catch (error) {
            logger.error("Webhook processing error", error);
            return res.status(500).json({
                error: "Failed to process webhook event"
            });
        }
    }
}

module.exports = WebhookController;
