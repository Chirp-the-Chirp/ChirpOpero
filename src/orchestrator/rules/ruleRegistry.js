"use strict";

/**
 * Shared one-shot rule registry.
 * Static rules live separately from flow definitions because they do not create
 * multi-step stateful conversations.
 */
const ruleRegistry = Object.freeze({
    greetingHi: {
        id: "greetingHi",
        trigger: {
            type: "keyword",
            values: ["hi"]
        },
        response: {
            type: "text",
            text: "Hey there! How can I help you today?"
        }
    },
    greetingHello: {
        id: "greetingHello",
        trigger: {
            type: "keyword",
            values: ["hello"]
        },
        response: {
            type: "text",
            text: "Hey there! How can I help you today?"
        }
    },
    greetingHello: {
        id: "greetingHey",
        trigger: {
            type: "keyword",
            values: ["hey"]
        },
        response: {
            type: "text",
            text: "Hey there! How can I help you today?"
        }
    },
    helpRule: {
        id: "helpRule",
        trigger: {
            type: "keyword",
            values: ["help"]
        },
        response: {
            type: "text",
            text: "Sure, I can help! Tell me what you need and I will try to guide you."
        }
    }
});

module.exports = ruleRegistry;
