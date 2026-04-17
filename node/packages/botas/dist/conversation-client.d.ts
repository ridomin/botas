import type { CoreActivity, ResourceResponse } from './core-activity.js';
export interface BotApplicationOptions {
    clientId?: string;
    clientSecret?: string;
    tenantId?: string;
    managedIdentityClientId?: string;
    token?: (scope: string, tenantId: string) => Promise<string>;
}
export declare class TokenManager {
    private options;
    private cache;
    constructor(options: BotApplicationOptions);
    getToken(scope: string, tenantId?: string): Promise<string | undefined>;
}
export declare class ConversationClient {
    private tokenManager;
    constructor(options: BotApplicationOptions);
    sendCoreActivityAsync(serviceUrl: string, conversationId: string, activity: Partial<CoreActivity>): Promise<ResourceResponse | undefined>;
    addReaction(serviceUrl: string, conversationId: string, activityId: string, reactionType: string): Promise<void>;
}
