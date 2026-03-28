# ChirpOpero
Smart replies. Chaos, tamed!


# How to add a future strategy(LLM, RAG, etc..):

01 - Create a new module under src/orchestrator/strategies/
02 - Export it with createStrategy("yourStrategyName", async function execute(context) { ... })
03 - Read only from the normalized context.message, context.conversation, context.customer, and context.metadata
04 - Return either createHandledResult(decision, reason) or createNotHandledResult(reason)
05 - Add the strategy to getStrategyPipeline() in the correct order