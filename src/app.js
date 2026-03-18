"use strict";

const express = require("express");
const { urlencoded, json } = require("body-parser");

const verifyMetaSignature = require("./middleware/verifyMetaSignature");
const webhookRoutes = require("./routes/webhook.routes");
const healthRoutes = require("./routes/health.routes");

const app = express();

app.use(
    urlencoded({
        extended: true
    })
);

app.use(
    json({
        verify: verifyMetaSignature
    })
);

app.use("/", healthRoutes);
app.use("/", webhookRoutes);

module.exports = app;