"use strict";

const ruleRegistry = require("../../../../src/orchestrator/rules/ruleRegistry");

describe("ruleRegistry", () => {
    // These tests lock down the shared one-shot rule definitions.

    test("contains the expected static rules", () => {
        expect(Object.keys(ruleRegistry)).toEqual([
            "greetingHi",
            "greetingHello",
            "helpRule"
        ]);
    });

    test("each rule has a valid keyword trigger and text response", () => {
        Object.values(ruleRegistry).forEach((rule) => {
            expect(rule).toEqual({
                id: expect.any(String),
                trigger: {
                    type: "keyword",
                    values: expect.any(Array)
                },
                response: {
                    type: "text",
                    text: expect.any(String)
                }
            });
        });
    });
});
