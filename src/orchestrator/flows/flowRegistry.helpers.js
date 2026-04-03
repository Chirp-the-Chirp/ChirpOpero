"use strict";

const flowRegistry = require("./flowRegistry");
const stateHandlers = require("./stateHandlers");
const { matchRegistryItemByKeyword } = require("../helpers/triggerMatcher");

/**
 * Build a state-to-flow index once so state lookups stay simple and cheap.
 * @param {Object} [registry=flowRegistry] Flow registry source.
 * @returns {Object} Flat map of state -> flow definition.
 */
function buildStateToFlowMap(registry = flowRegistry) {
    return Object.values(registry).reduce((stateMap, flow) => {
        Object.keys(flow?.states || {}).forEach((state) => {
            stateMap[state] = flow;
        });
        return stateMap;
    }, {});
}

const stateToFlowMap = buildStateToFlowMap();

/**
 * Find the flow definition that owns a given conversation state.
 * @param {string|null} state Conversation state identifier.
 * @returns {Object|null} Matching flow definition or null.
 */
function findFlowByState(state) {
    if (!state) {
        return null;
    }

    return stateToFlowMap[state] || null;
}

/**
 * Resolve the concrete state definition from the registry.
 * @param {string|null} state Conversation state identifier.
 * @returns {Object|null} State configuration or null.
 */
function getStateConfig(state) {
    const flow = findFlowByState(state);

    if (!flow) {
        return null;
    }

    return flow.states[state] || null;
}

/**
 * Resolve the concrete state handler function referenced by the registry.
 * @param {string|null} state Conversation state identifier.
 * @returns {Function|null} Handler function or null.
 */
function resolveStateHandler(state) {
    const stateConfig = getStateConfig(state);
    const handlerName = stateConfig?.handler;

    if (!handlerName || typeof stateHandlers[handlerName] !== "function") {
        return null;
    }

    return stateHandlers[handlerName];
}

/**
 * Match a flow trigger against the incoming message text.
 * @param {string} messageText Incoming message text.
 * @param {Object} [registry=flowRegistry] Flow registry source.
 * @returns {Object|null} Matching flow definition or null.
 */
function matchFlowByTrigger(messageText, registry = flowRegistry) {
    return matchRegistryItemByKeyword(messageText, registry);
}

module.exports = {
    buildStateToFlowMap,
    findFlowByState,
    getStateConfig,
    resolveStateHandler,
    matchFlowByTrigger
};
