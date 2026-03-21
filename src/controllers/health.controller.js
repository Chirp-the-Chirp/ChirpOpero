"use strict";

const { createLogger } = require("../utils/logger");

const logger = createLogger("HealthController");

class HealthController {
    static getHealth(req, res) {
        logger.debug("Health endpoint hit");
        return res.json({
            message: "Jasper's Market Server is running",
            endpoints: [
                "GET /",
                "GET /webhook",
                "POST /webhook"
            ]
        });
    }
}

module.exports = HealthController;
