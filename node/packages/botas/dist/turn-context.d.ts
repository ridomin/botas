import type { CoreActivity, ResourceResponse, ChannelAccount } from './core-activity.js';
import type { BotApplication } from './bot-application.js';
export declare class TurnContext {
    readonly app: BotApplication;
    readonly activity: CoreActivity;
    constructor(app: BotApplication, activity: CoreActivity);
    send(textOrActivity: string | Partial<CoreActivity>): Promise<ResourceResponse | undefined>;
    sendTyping(): Promise<void>;
    sendTargeted(text: string, recipient: ChannelAccount): Promise<ResourceResponse | undefined>;
    addReaction(emojiOrType: string): Promise<void>;
}
