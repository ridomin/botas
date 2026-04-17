import type { CoreActivity, ChannelAccount } from './core-activity.js';
import type { TurnContext } from './turn-context.js';
import type { NextTurn } from './i-turn-middleware.js';
import { CoreActivityBuilder } from './core-activity-builder.js';
export interface TeamsChannelData {
    tenant?: {
        id: string;
    };
    notification?: {
        alert?: boolean;
    };
    [key: string]: any;
}
export declare class TeamsActivityBuilder extends CoreActivityBuilder {
    private teamsActivity;
    constructor();
    withConversationReference(reference: CoreActivity): this;
    withChannelData(channelData: TeamsChannelData): this;
    addMention(mentioned: ChannelAccount, text?: string): this;
    addAdaptiveCardAttachment(card: any): this;
    withSuggestedActions(suggestedActions: {
        actions: any[];
    }): this;
    build(): Partial<CoreActivity>;
}
export declare function removeMentionMiddleware(context: TurnContext, next: NextTurn): Promise<void>;
