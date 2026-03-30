"use strict";

const { createStrategy } = require("../contracts/strategyContract");
const {
    createHandledResult,
    createNotHandledResult
} = require("../contracts/strategyResultContract");
const {
    STATE_HANDLER_OUTCOMES,
    assertValidStateHandlerOutcome
} = require("../contracts/stateHandlerOutcomeContract");
const { assertValidDecision } = require("../contracts/decisionContract");
const { createFallbackDecision } = require("../decisionFactory");
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
 * Map a validated state-handler outcome back into the top-level decision contract.
 * This keeps state handlers focused on flow semantics while the strategy owns
 * orchestration-facing state persistence behavior.
 * @param {Object} outcome Validated state-handler outcome.
 * @param {string} activeState Currently persisted active state.
 * @returns {Object} Valid orchestrator decision.
 */
function mapOutcomeToDecision(outcome, activeState) {
    switch (outcome.status) {
        case STATE_HANDLER_OUTCOMES.TRANSITION:
            return assertValidDecision({
                ...outcome.decision,
                nextState: outcome.nextState
            });
        case STATE_HANDLER_OUTCOMES.RETRY:
            return assertValidDecision({
                ...outcome.decision,
                nextState: activeState
            });
        case STATE_HANDLER_OUTCOMES.COMPLETE:
        case STATE_HANDLER_OUTCOMES.FALLBACK:
            return assertValidDecision({
                ...outcome.decision,
                nextState: null
            });
        default:
            throw new Error(`unsupported state handler outcome: ${outcome.status}`);
    }
}

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

    try {
        const outcome = assertValidStateHandlerOutcome(await stateHandler(context));
        const decision = mapOutcomeToDecision(outcome, activeState);

        logger.debug("State handler completed", {
            customerId,
            flowId: flow.id,
            activeState,
            outcomeStatus: outcome.status,
            nextState: decision.nextState
        });

        return createHandledResult(
            decision,
            `continued ${activeState} flow with ${outcome.status}`
        );
    } catch (error) {
        logger.error("State handler failed", {
            customerId,
            flowId: flow.id,
            activeState,
            error
        });

        return createHandledResult(
            createFallbackDecision(),
            `state handler failure for active state: ${activeState}`
        );
    }
}

module.exports = createStrategy("stateStrategy", execute);
