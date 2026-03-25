"use strict";

const RedisService = require("./redis.service");
const { createLogger } = require("../utils/logger");

const logger = createLogger("ConversationStateService");

/**
 * Build the Redis key used to persist a customer's conversation state.
 * @param {string} customerId Unique customer identifier.
 * @returns {string} Redis key for the customer conversation record.
 */
function getConversationKey(customerId) {
    return `conversation_state:${customerId}`;
}

/**
 * Convert supported timestamp formats into a normalized ISO string.
 * @param {string|number|null|undefined} value Raw timestamp value.
 * @returns {string} ISO timestamp string.
 */
function getIsoTimestamp(value) {
    if (!value) {
        return new Date().toISOString();
    }

    const numericValue = Number(value);
    if (!Number.isNaN(numericValue)) {
        return new Date(numericValue * 1000).toISOString();
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return new Date().toISOString();
    }

    return parsedDate.toISOString();
}

/**
 * Create the default state object used when no persisted conversation exists yet.
 * @returns {Object} Default conversation state.
 */
function createDefaultState() {
    return {
        state: null,
        lastRoute: null,
        lastHandledAt: null,
        lastMessageAt: null,
        lastMessageId: null,
        lastMessageType: null,
        updatedAt: null
    };
}

/**
 * Merge persisted data with the default state shape.
 * @param {Object|null|undefined} storedState Stored conversation state from Redis.
 * @returns {Object} Normalized conversation state.
 */
function normalizeState(storedState) {
    return {
        ...createDefaultState(),
        ...(storedState || {})
    };
}

class ConversationStateService {
    /**
     * Retrieve persisted conversation state for a customer.
     * @param {string} customerId Unique customer identifier.
     * @returns {Promise<Object>} Normalized conversation state.
     */
    static async getConversationState(customerId) {
        if (!customerId) {
            return createDefaultState();
        }

        try {
            const storedState = await RedisService.getJson(
                getConversationKey(customerId)
            );
            return normalizeState(storedState);
        } catch (error) {
            logger.error("Failed to retrieve conversation state", {
                customerId,
                error
            });
            throw error;
        }
    }

    /**
     * Persist conversation state updates for a customer.
     * @param {string} customerId Unique customer identifier.
     * @param {Object} updates Partial state updates to merge.
     * @returns {Promise<Object>} Updated normalized conversation state.
     */
    static async updateConversationState(customerId, updates) {
        if (!customerId) {
            return createDefaultState();
        }

        try {
            const currentState = await this.getConversationState(customerId);
            const nextState = normalizeState({
                ...currentState,
                ...updates,
                updatedAt: new Date().toISOString()
            });

            await RedisService.setJson(getConversationKey(customerId), nextState);
            logger.debug("Conversation state updated", {
                customerId,
                state: nextState
            });

            return nextState;
        } catch (error) {
            logger.error("Failed to update conversation state", {
                customerId,
                updates,
                error
            });
            throw error;
        }
    }

    /**
     * Return only the context fields the orchestrator needs for routing.
     * @param {string} customerId Unique customer identifier.
     * @returns {Promise<Object>} Orchestrator-facing conversation context.
     */
    static async getContextForOrchestrator(customerId) {
        const state = await this.getConversationState(customerId);

        return {
            state: state.state,
            lastRoute: state.lastRoute,
            lastHandledAt: state.lastHandledAt
        };
    }

    /**
     * Store metadata from the latest inbound message before orchestration runs.
     * @param {Object} message Parsed inbound message model.
     * @returns {Promise<Object>} Updated conversation state.
     */
    static async recordIncomingMessage(message) {
        const customerId = message?.senderPhoneNumber;

        return this.updateConversationState(customerId, {
            lastMessageAt: getIsoTimestamp(message?.eventTimestamp),
            lastMessageId: message?.id || null,
            lastMessageType: message?.type || null
        });
    }

    /**
     * Persist the latest route and handling metadata after an interaction completes.
     * @param {string} customerId Unique customer identifier.
     * @param {Object} decision Orchestrator decision payload.
     * @returns {Promise<Object>} Updated conversation state.
     */
    static async recordInteractionResult(customerId, decision) {
        const currentState = await this.getConversationState(customerId);

        return this.updateConversationState(customerId, {
            state:
                decision?.nextState !== undefined && decision?.nextState !== null
                    ? decision.nextState
                    : currentState.state,
            lastRoute: decision?.source || currentState.lastRoute,
            lastHandledAt: new Date().toISOString()
        });
    }

    /**
     * Persist status-only metadata without invoking any decisioning logic.
     * @param {string} customerId Unique customer identifier.
     * @param {Object} status Raw WhatsApp status payload.
     * @returns {Promise<Object>} Updated conversation state.
     */
    static async recordStatusUpdate(customerId, status) {
        return this.updateConversationState(customerId, {
            lastHandledAt: new Date().toISOString(),
            lastRoute: status?.status || null
        });
    }
}

module.exports = ConversationStateService;
