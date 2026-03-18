"use strict";

class HealthController {
    static getHealth(req, res) {
        console.log("Hit 01");
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