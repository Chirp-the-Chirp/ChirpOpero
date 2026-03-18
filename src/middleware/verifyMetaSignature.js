"use strict";

const crypto = require("crypto");
const env = require("../config/env");

function verifyMetaSignature(req, res, buf) {
    const signature = req.headers["x-hub-signature-256"];

    if (!signature) {
        console.warn('Could not find "x-hub-signature-256" in headers.');
        return;
    }

    const elements = signature.split("=");
    const signatureHash = elements[1];

    const expectedHash = crypto
        .createHmac("sha256", env.appSecret)
        .update(buf)
        .digest("hex");

    if (signatureHash !== expectedHash) {
        throw new Error("Could not validate the request signature.");
    }
}

module.exports = verifyMetaSignature;