"use strict";

const { createLogger } = require("../../utils/logger");

const logger = createLogger("TriggerMatcher");

/**
 * Shared keyword-trigger matcher used by both flow and static-rule registries.
 * Keeping this logic centralized prevents trigger-matching drift across strategies.
 */

/**
 * Match a registry item by keyword trigger.
 * @param {string} messageText Incoming message text.
 * @param {Object} registry Registry object containing trigger-enabled entries.
 * @returns {Object|null} Matching registry entry or null.
 */
function matchRegistryItemByKeyword(messageText, registry) {
    const normalizedText = typeof messageText === "string"
        ? messageText.trim().toLowerCase()
        : "";

    if (!normalizedText || !registry || typeof registry !== "object") {
        return null;
    }

    for (const item of Object.values(registry)) {
        const trigger = item?.trigger;

        if (!trigger) {
            continue;
        }

        if (trigger.type !== "keyword" || !Array.isArray(trigger.values)) {
            logger.warn("Skipping malformed keyword trigger configuration", {
                itemId: item?.id || null
            });
            continue;
        }

        const matched = trigger.values.some((value) => {
            return typeof value === "string" && value.trim().toLowerCase() === normalizedText;
        });

        if (matched) {
            logger.debug("Matched keyword trigger", {
                itemId: item.id,
                text: normalizedText
            });
            return item;
        }
    }

    return null;
}

module.exports = {
    matchRegistryItemByKeyword
};
