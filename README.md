# ChirpOpero
Smart replies. Chaos, tamed!


# How to add a future strategy(LLM, RAG, etc..):

01 - Create a new module under src/orchestrator/strategies/
02 - Export it with createStrategy("yourStrategyName", async function execute(context) { ... })
03 - Read only from the normalized context.message, context.conversation, context.customer, and context.metadata
04 - Return either createHandledResult(decision, reason) or createNotHandledResult(reason)
05 - Add the strategy to getStrategyPipeline() in the correct order


# TODO
# Next Steps
* Real FAQ matching and curated answer source.
* Real RAG retrieval/index/query flow.
* Real LLM generation path with prompts, safety, and response controls.
* Real template policy enforcement, including WhatsApp window/policy decisions.
* Real human handoff behavior and operator routing.
* More conversation flows beyond the sample order flow.
* Integration/e2e coverage; current automated coverage is strong on unit tests, but not on full webhook-to-Redis-to-Meta end-to-end behavior.

# TODO
# User's message Intent extractor
* Introduce an intent extraction layer that classifies both new and in-progress user messages into structured intents (for example `place_order`, `ask_menu`, `ask_price`, `ask_delivery`, `ask_return_policy`, `backorder_request`, `negotiation`, `small_talk`, `unknown`) so the orchestrator can choose the right strategy and flow path with confidence instead of relying only on exact keyword/flow matches.
* Design goal: make intent extraction a routing capability, not the final response generator. The orchestrator should remain the decision-maker and use detected intent as an input when choosing deterministic flow handling, FAQ, RAG, LLM, template policy, or human handoff.
* Suggested output shape:
  * `intent`: normalized label such as `place_order`, `ask_menu`, `ask_price`, `ask_delivery`, `ask_return_policy`, `backorder_request`, `negotiation`, `small_talk`, `unknown`
  * `confidence`: numeric confidence score
  * `source`: `rule_engine` | `classifier` | `llm`
  * `entities`: extracted structured values such as item name, quantity, location, order id, delivery area, requested date
  * `reason`: short internal explanation for logs/debugging
* Suggested orchestration behavior:
  * keep `preCheckStrategy` first
  * keep `stateStrategy` early so active conversations still get priority
  * run deterministic flow/rule matching before broader intent classification where exact matches already exist
  * use intent extraction when deterministic matching does not produce a confident route
* Suggested future pipeline direction:
  * `preCheckStrategy`
  * `stateStrategy`
  * `ruleBasedStrategy`
  * `intentStrategy`
  * `faqStrategy`
  * `ragStrategy`
  * `llmStrategy`
  * `templatePolicyEvaluator`
  * `humanHandoffStrategy`
* New conversations and continued conversations should both use intent extraction. A user may start with a goal (`"I need 2kg carrots"`), but they may also change direction mid-flow (`"actually can you deliver to Maharagama?"`) and the system should detect that instead of assuming every next message belongs to the current state.
* Intent extraction should support at least these near-term business scenarios:
  * customer wants to place an order
  * customer asks for menu/items available
  * customer asks for current prices
  * customer asks about delivery areas/options/fees
  * customer asks about return/refund policy
  * customer wants out-of-stock backorder or notify-when-available behavior
  * customer negotiates quantity or price
  * customer gives unsupported/ambiguous/free-form input
* Recommended implementation phases:
  * Phase 1: deterministic intent rules for obvious phrasing and high-precision keywords
  * Phase 2: entity extraction for item names, quantities, locations, and dates
  * Phase 3: FAQ/RAG-assisted intent refinement for policy and catalog questions
  * Phase 4: LLM-backed intent classification for ambiguous or multi-intent messages
* State interaction rule: the active conversation state should not blindly override message intent. If the user clearly changes topic, asks for a human, or asks an unrelated question, the orchestrator should be able to pause, switch, or terminate the current flow safely.
* Logging/observability requirement: every extracted intent should be logged with message id, customer id, intent label, confidence, and chosen downstream strategy so misroutes can be audited and improved over time.
* Testing requirement: add unit tests for intent classification, confidence thresholds, entity extraction, active-flow interruption behavior, and strategy-selection decisions based on intent results.
