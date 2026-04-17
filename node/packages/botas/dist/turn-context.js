"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnContext = void 0;
const EMOJI_MAP = {
    '👍': 'like',
    '❤️': 'heart',
    '😂': 'laugh',
    '😮': 'surprised',
    '😢': 'sad',
    '😠': 'angry'
};
class TurnContext {
    app;
    activity;
    constructor(app, activity) {
        this.app = app;
        this.activity = activity;
    }
    async send(textOrActivity) {
        const activity = typeof textOrActivity === 'string'
            ? { type: 'message', text: textOrActivity }
            : { ...textOrActivity };
        // Copy routing fields
        if (!activity.serviceUrl)
            activity.serviceUrl = this.activity.serviceUrl;
        if (!activity.conversation)
            activity.conversation = { ...this.activity.conversation };
        if (!activity.from)
            activity.from = { ...this.activity.recipient };
        if (!activity.recipient)
            activity.recipient = { ...this.activity.from };
        if (!activity.channelId)
            activity.channelId = this.activity.channelId;
        return await this.app.conversationClient.sendCoreActivityAsync(activity.serviceUrl, activity.conversation.id, activity);
    }
    async sendTyping() {
        await this.send({ type: 'typing' });
    }
    async sendTargeted(text, recipient) {
        return await this.send({
            type: 'message',
            text,
            recipient,
            isTargeted: true
        });
    }
    async addReaction(emojiOrType) {
        const reactionType = EMOJI_MAP[emojiOrType] ?? emojiOrType;
        if (!this.activity.id) {
            throw new Error('Cannot add reaction: incoming activity has no id');
        }
        await this.app.conversationClient.addReaction(this.activity.serviceUrl, this.activity.conversation.id, this.activity.id, reactionType);
    }
}
exports.TurnContext = TurnContext;
