"use strict";

const env = require("../config/env");
const Message = require("../models/message.model");
const { orchestrate } = require("../orchestrator/conversationOrchestrator");
const { ACTIONS } = require("../orchestrator/decisionTypes");
const GraphApiService = require("../services/graph-api.service");
const ConversationStateService = require("../services/conversation-state.service");
const { createLogger } = require("../utils/logger");

const logger = createLogger("WebhookController");

/**
 * Build the orchestrator input payload from the parsed message and stored context.
 * @param {Message} message Parsed inbound message.
 * @param {Object} conversation Conversation state/context loaded from storage.
 * @returns {Object} Orchestrator input payload.
 */
function buildOrchestratorInput(message, conversation) {
    return {
        message: {
            messageId: message.id || null,
            from: message.senderPhoneNumber || null,
            type: message.type || null,
            text: message.content || "",
            timestamp: message.eventTimestamp ? String(message.eventTimestamp) : null
        },
        conversation: conversation || {},
        customer: {
            customerId: message.senderPhoneNumber || null
        },
        metadata: {
            channel: "whatsapp"
        }
    };
}

class WebhookController {
    /**
     * Verify the webhook subscription challenge sent by Meta.
     * @param {Object} req Express request object.
     * @param {Object} res Express response object.
     * @returns {Object} Express response.
     */
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

    /**
     * Route incoming webhook changes to the correct internal handler.
     * @param {Object} req Express request object.
     * @param {Object} res Express response object.
     * @returns {Promise<Object>} Express response.
     */
    static async handleWebhook(req, res) {
        logger.debug("Webhook POST hit");
        logger.debug("Incoming webhook payload", req.body);

        try {
            if (req.body.object === "whatsapp_business_account") {
                for (const entry of req.body.entry || []) {
                    for (const change of entry.changes || []) {
                        const value = change.value;
                        if (!value) {
                            continue;
                        }

                        const senderPhoneNumberId = value?.metadata?.phone_number_id;

                        if (value.messages) {
                            for (const rawMessage of value.messages) {
                                await WebhookController.handleMessage(
                                    senderPhoneNumberId,
                                    rawMessage
                                );
                            }
                        }

                        if (value.statuses) {
                            for (const rawStatus of value.statuses) {
                                await WebhookController.handleStatus(
                                    senderPhoneNumberId,
                                    rawStatus
                                );
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

    /**
     * Parse the inbound message, hydrate context, orchestrate the response, and execute it.
     * @param {string} senderPhoneNumberId Meta phone number id for the business account.
     * @param {Object} rawMessage Raw inbound WhatsApp message payload.
     * @returns {Promise<void>}
     */
    static async handleMessage(senderPhoneNumberId, rawMessage) {
        try {
            const message = new Message(rawMessage);

            // Persist inbound metadata first so the orchestrator always sees fresh context.
            await ConversationStateService.recordIncomingMessage(message);

            const conversationContext =
                await ConversationStateService.getContextForOrchestrator(
                    message.senderPhoneNumber
                );
            const input = buildOrchestratorInput(message, conversationContext);
            const decision = await orchestrate(input);

            logger.debug("Message orchestration completed", {
                messageId: message.id,
                decision
            });

            if (
                decision.action === ACTIONS.REPLY &&
                decision.response?.type === "text" &&
                decision.response.text
            ) {
                await GraphApiService.messageWithText(
                    message.id,
                    senderPhoneNumberId,
                    message.senderPhoneNumber,
                    decision.response.text
                );
            }

            // Update state after execution so later turns can reuse the latest route/timestamps.
            await ConversationStateService.recordInteractionResult(
                message.senderPhoneNumber,
                decision
            );
        } catch (error) {
            logger.error("Failed to handle incoming message", {
                senderPhoneNumberId,
                rawMessage,
                error
            });
            throw error;
        }
    }

    /**
     * Track status-only events without invoking orchestration.
     * @param {string} senderPhoneNumberId Meta phone number id for the business account.
     * @param {Object} rawStatus Raw WhatsApp status payload.
     * @returns {Promise<void>}
     */
    static async handleStatus(senderPhoneNumberId, rawStatus) {
        try {
            const customerId = rawStatus?.recipient_id || null;

            if (customerId) {
                await ConversationStateService.recordStatusUpdate(
                    customerId,
                    rawStatus
                );
            }

            logger.debug("Received status update", {
                senderPhoneNumberId,
                status: rawStatus
            });
        } catch (error) {
            logger.error("Failed to handle status update", {
                senderPhoneNumberId,
                rawStatus,
                error
            });
            throw error;
        }
    }
}

module.exports = WebhookController;
