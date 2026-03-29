"use strict";

const { createStrategy } = require("../contracts/strategyContract");
const { createNotHandledResult } = require("../contracts/strategyResultContract");
const ConversationStateService = require("../../services/conversation-state.service");
const {
    findFlowByState,
    resolveStateHandler
} = require("../flows/flowRegistry.helpers");
const { createLogger } = require("../../utils/logger");

const logger = createLogger("StateStrategy");

/**
 * Continue active conversation flows before generic strategies run.
 * Only already-active states are handled here; flow-start logic stays elsewhere.
 */

/**
 * Read the persisted conversation state and continue supported active flows.
 * @param {Object} context Normalized orchestrator context.
 * @returns {Promise<Object>} Strategy result.
 */
async function execute(context) {
    const customerId = context?.customer?.customerId || context?.message?.from;

    if (!customerId) {
        logger.debug("Skipping state strategy due to missing customer id");
        return createNotHandledResult("state strategy skipped due to missing customer id");
    }

    const conversationState =
        await ConversationStateService.getConversationState(customerId);
    const activeState = conversationState?.state || null;

    if (!activeState) {
        logger.debug("No active conversation state found", {
            customerId
        });
        return createNotHandledResult("no active conversation state");
    }

    const flow = findFlowByState(activeState);

    if (!flow) {
        logger.debug("Unsupported active state encountered", {
            customerId,
            activeState
        });
        return createNotHandledResult(`unsupported active state: ${activeState}`);
    }

    const stateHandler = resolveStateHandler(activeState);

    if (!stateHandler) {
        logger.warn("Missing state handler for active state", {
            customerId,
            activeState,
            flowId: flow.id
        });
        return createNotHandledResult(
            `missing state handler for active state: ${activeState}`
        );
    }

    logger.debug("Continuing active flow state", {
        customerId,
        flowId: flow.id,
        activeState
    });
    return stateHandler(context);
}

module.exports = createStrategy("stateStrategy", execute);
