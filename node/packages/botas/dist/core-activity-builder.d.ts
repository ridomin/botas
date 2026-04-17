import type { ChannelAccount, CoreActivity, Conversation } from './core-activity.js';
export declare class CoreActivityBuilder {
    private activity;
    withType(type: string): this;
    withText(text: string): this;
    withRecipient(recipient: ChannelAccount, isTargeted?: boolean): this;
    withFrom(from: ChannelAccount): this;
    withConversation(conversation: Conversation): this;
    withServiceUrl(serviceUrl: string): this;
    withConversationReference(reference: CoreActivity): this;
    addEntity(entity: any): this;
    addAttachment(attachment: any): this;
    withValue(value: any): this;
    withName(name: string): this;
    build(): Partial<CoreActivity>;
}
