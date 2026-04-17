"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamsActivityBuilder = void 0;
exports.removeMentionMiddleware = removeMentionMiddleware;
const core_activity_builder_js_1 = require("./core-activity-builder.js");
class TeamsActivityBuilder extends core_activity_builder_js_1.CoreActivityBuilder {
    teamsActivity = {};
    constructor() {
        super();
    }
    withConversationReference(reference) {
        super.withConversationReference(reference);
        return this;
    }
    withChannelData(channelData) {
        this.teamsActivity.channelData = channelData;
        return this;
    }
    addMention(mentioned, text) {
        const mentionText = text ?? `<at>${mentioned.name ?? 'User'}</at>`;
        const currentText = (this.build().text ?? '');
        this.withText(`${currentText} ${mentionText}`.trim());
        this.addEntity({
            type: 'mention',
            mentioned: { ...mentioned },
            text: mentionText
        });
        return this;
    }
    addAdaptiveCardAttachment(card) {
        this.addAttachment({
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: card
        });
        return this;
    }
    withSuggestedActions(suggestedActions) {
        this.teamsActivity.suggestedActions = suggestedActions;
        return this;
    }
    build() {
        const base = super.build();
        return { ...base, ...this.teamsActivity };
    }
}
exports.TeamsActivityBuilder = TeamsActivityBuilder;
async function removeMentionMiddleware(context, next) {
    const activity = context.activity;
    if (activity.type === 'message' && activity.text && activity.entities) {
        const botMention = activity.entities.find((e) => e.type === 'mention' && e.mentioned?.id === activity.recipient.id);
        if (botMention) {
            const mentionText = botMention.text;
            if (mentionText) {
                activity.text = activity.text.replace(mentionText, '').trim();
            }
        }
    }
    await next();
}
