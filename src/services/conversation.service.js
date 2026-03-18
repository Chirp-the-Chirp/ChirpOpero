"use strict";

const constants = require("../config/constants");
const GraphApiService = require("./graph-api.service");
const Message = require("../models/message.model");
const Status = require("../models/status.model");
const RedisService = require("./redis.service");

async function sendMainMenuMessage(messageId, senderPhoneNumberId, recipientPhoneNumber, messageBody) {
    return GraphApiService.messageWithInteractiveReply(
        messageId,
        senderPhoneNumberId,
        recipientPhoneNumber,
        messageBody,
        [
            {
                id: constants.REPLY_INTERACTIVE_MEDIA_ID,
                title: constants.REPLY_INTERACTIVE_WITH_MEDIA_CTA
            },
            {
                id: constants.REPLY_MEDIA_CAROUSEL_ID,
                title: constants.REPLY_MEDIA_CARD_CAROUSEL_CTA
            },
            {
                id: constants.REPLY_OFFER_ID,
                title: constants.REPLY_OFFER_CTA
            }
        ]
    );
}

async function sendInteractiveMediaMessage(messageId, senderPhoneNumberId, recipientPhoneNumber) {
    return GraphApiService.messageWithUtilityTemplate(
        messageId,
        senderPhoneNumberId,
        recipientPhoneNumber,
        {
            templateName: "grocery_delivery_utility",
            locale: "en_US",
            imageLink:
                "https://scontent.xx.fbcdn.net/mci_ab/uap/asset_manager/id/?ab_b=e&ab_page=AssetManagerID&ab_entry=1530053877871776"
        }
    );
}

async function sendLimitedTimeOfferMessage(messageId, senderPhoneNumberId, recipientPhoneNumber) {
    return GraphApiService.messageWithLimitedTimeOfferTemplate(
        messageId,
        senderPhoneNumberId,
        recipientPhoneNumber,
        {
            templateName: "strawberries_limited_offer",
            locale: "en_US",
            imageLink:
                "https://scontent.xx.fbcdn.net/mci_ab/uap/asset_manager/id/?ab_b=e&ab_page=AssetManagerID&ab_entry=1393969325614091",
            offerCode: "BERRIES20"
        }
    );
}

async function sendMediaCarouselMessage(messageId, senderPhoneNumberId, recipientPhoneNumber) {
    return GraphApiService.messageWithMediaCardCarousel(
        messageId,
        senderPhoneNumberId,
        recipientPhoneNumber,
        {
            templateName: "recipe_media_carousel",
            locale: "en_US",
            imageLinks: [
                "https://scontent.xx.fbcdn.net/mci_ab/uap/asset_manager/id/?ab_b=e&ab_page=AssetManagerID&ab_entry=1389202275965231",
                "https://scontent.xx.fbcdn.net/mci_ab/uap/asset_manager/id/?ab_b=e&ab_page=AssetManagerID&ab_entry=3255815791260974"
            ]
        }
    );
}

async function markMessageForFollowUp(messageId) {
  await RedisService.insert(messageId);
}

class ConversationService {
    static async handleMessage(senderPhoneNumberId, rawMessage) {
        const message = new Message(rawMessage);

        switch (message.type) {
        case constants.REPLY_INTERACTIVE_MEDIA_ID: {
            const response = await sendInteractiveMediaMessage(
                    message.id,
                    senderPhoneNumberId,
                    message.senderPhoneNumber
                );
            await markMessageForFollowUp(response.messages[0].id);
            break;
        }

        case constants.REPLY_MEDIA_CAROUSEL_ID: {
            const response = await sendMediaCarouselMessage(
                    message.id,
                    senderPhoneNumberId,
                    message.senderPhoneNumber
                );
            await markMessageForFollowUp(response.messages[0].id);
            break;
        }

        case constants.REPLY_OFFER_ID: {
            const response = await sendLimitedTimeOfferMessage(
                    message.id,
                    senderPhoneNumberId,
                    message.senderPhoneNumber
                );
            await markMessageForFollowUp(response.messages[0].id);
            break;
        }

        default:
            await sendMainMenuMessage(
                    message.id,
                    senderPhoneNumberId,
                    message.senderPhoneNumber,
                    constants.APP_DEFAULT_MESSAGE
                );
            break;
        }
    }

    static async handleStatus(senderPhoneNumberId, rawStatus) {
        const status = new Status(rawStatus);

        if (!(status.status === "delivered" || status.status === "read")) {
            return;
        }

        if (await RedisService.remove(status.messageId)) {
            await sendMainMenuMessage(
                undefined,
                senderPhoneNumberId,
                status.recipientPhoneNumber,
                constants.APP_TRY_ANOTHER_MESSAGE
            );
        }
    }
}

module.exports = ConversationService;