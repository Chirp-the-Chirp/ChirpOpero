"use strict";

const { FacebookAdsApi } = require("facebook-nodejs-business-sdk");
const env = require("../config/env");
const { createLogger } = require("../utils/logger");

const api = new FacebookAdsApi(env.accessToken);
const logger = createLogger("GraphApiService");

class GraphApiService {
static async #makeApiCall(messageId, senderPhoneNumberId, requestBody) {
    try {
        if (messageId) {
            const typingBody = {
            messaging_product: "whatsapp",
            status: "read",
            message_id: messageId,
            typing_indicator: {
                type: "text"
            }
            };

            await api.call(
            "POST",
            [`${senderPhoneNumberId}`, "messages"],
            typingBody
            );
        }

        const response = await api.call(
            "POST",
            [`${senderPhoneNumberId}`, "messages"],
            requestBody
        );

        logger.debug("Response is successfully sent: ", response);
        return response;
    } catch (error) {
        logger.error("Error making Meta API call", error);
        throw error;
    }
}

static async messageWithInteractiveReply(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    messageText,
    replyCTAs
) {
    const requestBody = {
        messaging_product: "whatsapp",
        to: recipientPhoneNumber,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: messageText
            },
            action: {
                buttons: replyCTAs.map((cta) => ({
                    type: "reply",
                    reply: {
                    id: cta.id,
                    title: cta.title
                    }
                }))
            }
        }
    };

    return this.#makeApiCall(messageId, senderPhoneNumberId, requestBody);
}

static async messageWithText(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    messageText
) {
    const requestBody = {
        messaging_product: "whatsapp",
        to: recipientPhoneNumber,
        type: "text",
        text: {
            body: messageText
        }
    };

    return this.#makeApiCall(messageId, senderPhoneNumberId, requestBody);
}

static async messageWithUtilityTemplate(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    options
) {
    const { templateName, locale, imageLink } = options;

    const requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhoneNumber,
        type: "template",
        template: {
            name: templateName,
            language: {
                code: locale
            },
            components: [
                {
                    type: "header",
                    parameters: [
                        {
                            type: "image",
                            image: {
                                link: imageLink
                            }
                        }
                    ]
                }
            ]
        }
    };

    return this.#makeApiCall(messageId, senderPhoneNumberId, requestBody);
}

static async messageWithLimitedTimeOfferTemplate(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    options
) {
    const { templateName, locale, imageLink, offerCode } = options;

    const currentTime = new Date();
    const futureTime = new Date(currentTime.getTime() + 48 * 60 * 60 * 1000);

    const requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhoneNumber,
        type: "template",
        template: {
            name: templateName,
            language: {
            code: locale
            },
            components: [
                {
                    type: "header",
                    parameters: [
                        {
                            type: "image",
                            image: {
                            link: imageLink
                            }
                        }
                    ]
                },
                {
                    type: "limited_time_offer",
                    parameters: [
                        {
                            type: "limited_time_offer",
                            limited_time_offer: {
                            expiration_time_ms: futureTime.getTime()
                            }
                        }
                    ]
                },
                {
                    type: "button",
                    sub_type: "copy_code",
                    index: 0,
                    parameters: [
                        {
                            type: "coupon_code",
                            coupon_code: offerCode
                        }
                    ]
                }
            ]
        }
    };

    return this.#makeApiCall(messageId, senderPhoneNumberId, requestBody);
}

static async messageWithMediaCardCarousel(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    options
) {
    const { templateName, locale, imageLinks } = options;

    const requestBody = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipientPhoneNumber,
            type: "template",
            template: {
                name: templateName,
                language: {
                    code: locale
                },
                components: [
                    {
                        type: "carousel",
                        cards: imageLinks.map((imageLink, idx) => ({
                            card_index: idx,
                            components: [
                                {
                                type: "header",
                                parameters: [
                                    {
                                    type: "image",
                                    image: {
                                        link: imageLink
                                    }
                                    }
                                ]
                                }
                            ]
                        }))
                    }
                ]
            }
        };

        return this.#makeApiCall(messageId, senderPhoneNumberId, requestBody);
    }
}

module.exports = GraphApiService;
