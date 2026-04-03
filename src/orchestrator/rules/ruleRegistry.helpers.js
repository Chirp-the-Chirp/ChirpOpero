"use strict";

const ruleRegistry = require("./ruleRegistry");
const { matchRegistryItemByKeyword } = require("../helpers/triggerMatcher");

/**
 * Match a one-shot static rule by trigger.
 * @param {string} messageText Incoming message text.
 * @param {Object} [registry=ruleRegistry] Rule registry source.
 * @returns {Object|null} Matching rule definition or null.
 */
function matchRuleByTrigger(messageText, registry = ruleRegistry) {
    return matchRegistryItemByKeyword(messageText, registry);
}

module.exports = {
    matchRuleByTrigger
};
