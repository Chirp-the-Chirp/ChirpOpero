"use strict";

const ACTIONS = Object.freeze({
    REPLY: "reply",
    NO_REPLY: "no_reply",
    HANDOFF_TO_HUMAN: "handoff_to_human",
    SEND_TEMPLATE: "send_template",
    ERROR: "error"
});

const SOURCES = Object.freeze({
    RULE_ENGINE: "rule_engine",
    RAG: "rag",
    LLM: "llm",
    TEMPLATE_ENGINE: "template_engine",
    HUMAN_HANDOFF: "human_handoff"
});

module.exports = {
    ACTIONS,
    SOURCES
};
