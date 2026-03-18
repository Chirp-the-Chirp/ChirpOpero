"use strict";

class Status {
    constructor(rawStatus) {
        this.messageId = rawStatus.id;
        this.status = rawStatus.status;
        this.recipientPhoneNumber = rawStatus.recipient_id;
    }
}

module.exports = Status;