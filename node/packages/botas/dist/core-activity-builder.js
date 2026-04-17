"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreActivityBuilder = void 0;
class CoreActivityBuilder {
    activity = {
        type: 'message',
        entities: [],
        attachments: []
    };
    withType(type) {
        this.activity.type = type;
        return this;
    }
    withText(text) {
        this.activity.text = text;
        return this;
    }
    withRecipient(recipient, isTargeted) {
        this.activity.recipient = { ...recipient };
        if (isTargeted !== undefined) {
            this.activity.isTargeted = isTargeted;
        }
        return this;
    }
    withFrom(from) {
        this.activity.from = { ...from };
        return this;
    }
    withConversation(conversation) {
        this.activity.conversation = { ...conversation };
        return this;
    }
    withServiceUrl(serviceUrl) {
        this.activity.serviceUrl = serviceUrl;
        return this;
    }
    withConversationReference(reference) {
        this.activity.serviceUrl = reference.serviceUrl;
        this.activity.conversation = { ...reference.conversation };
        this.activity.from = { ...reference.recipient };
        this.activity.recipient = { ...reference.from };
        this.activity.channelId = reference.channelId;
        return this;
    }
    addEntity(entity) {
        this.activity.entities?.push(entity);
        return this;
    }
    addAttachment(attachment) {
        this.activity.attachments?.push(attachment);
        return this;
    }
    withValue(value) {
        this.activity.value = value;
        return this;
    }
    withName(name) {
        this.activity.name = name;
        return this;
    }
    build() {
        return { ...this.activity };
    }
}
exports.CoreActivityBuilder = CoreActivityBuilder;
