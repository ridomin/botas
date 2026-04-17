import { ConversationClient, type BotApplicationOptions } from './conversation-client.js';
import { TurnContext } from './turn-context.js';
import type { CoreActivity, InvokeResponse } from './core-activity.js';
import type { TurnMiddleware } from './i-turn-middleware.js';
export declare class BotHandlerException extends Error {
    readonly cause: unknown;
    readonly activity: CoreActivity;
    constructor(message: string, cause: unknown, activity: CoreActivity);
}
export declare class BotApplication {
    readonly conversationClient: ConversationClient;
    private middleware;
    private handlers;
    private invokeHandlers;
    onActivity?: (ctx: TurnContext) => Promise<void>;
    constructor(options?: BotApplicationOptions);
    use(middleware: TurnMiddleware): this;
    on(type: string, handler: (ctx: TurnContext) => Promise<void>): this;
    onInvoke(name: string, handler: (ctx: TurnContext) => Promise<InvokeResponse>): this;
    processBody(body: string): Promise<InvokeResponse | undefined>;
}
