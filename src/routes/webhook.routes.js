"use strict";

const express = require("express");
const WebhookController = require("../controllers/webhook.controller");

const router = express.Router();

router.get("/webhook", WebhookController.verify);
router.post("/webhook", WebhookController.handleWebhook);

module.exports = router;