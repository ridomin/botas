"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotApplication = exports.BotHandlerException = void 0;
const conversation_client_js_1 = require("./conversation-client.js");
const turn_context_js_1 = require("./turn-context.js");
class BotHandlerException extends Error {
    cause;
    activity;
    constructor(message, cause, activity) {
        super(message);
        this.cause = cause;
        this.activity = activity;
        this.name = 'BotHandlerException';
    }
}
exports.BotHandlerException = BotHandlerException;
class BotApplication {
    conversationClient;
    middleware = [];
    handlers = new Map();
    invokeHandlers = new Map();
    onActivity;
    constructor(options = {}) {
        this.conversationClient = new conversation_client_js_1.ConversationClient(options);
    }
    use(middleware) {
        this.middleware.push(middleware);
        return this;
    }
    on(type, handler) {
        this.handlers.set(type.toLowerCase(), handler);
        return this;
    }
    onInvoke(name, handler) {
        this.invokeHandlers.set(name, handler);
        return this;
    }
    async processBody(body) {
        const activity = JSON.parse(body);
        // Basic validation
        if (!activity.type || !activity.serviceUrl || !activity.conversation?.id) {
            throw new Error('Invalid activity: missing required fields (type, serviceUrl, conversation.id)');
        }
        const context = new turn_context_js_1.TurnContext(this, activity);
        let invokeResponse;
        const runPipeline = async (index) => {
            if (index < this.middleware.length) {
                await this.middleware[index](context, () => runPipeline(index + 1));
            }
            else {
                // Dispatch to handler
                if (this.onActivity) {
                    await this.onActivity(context);
                }
                else if (activity.type.toLowerCase() === 'invoke') {
                    const handler = this.invokeHandlers.get(activity.name ?? '');
                    if (handler) {
                        invokeResponse = await handler(context);
                    }
                }
                else {
                    const handler = this.handlers.get(activity.type.toLowerCase());
                    if (handler) {
                        await handler(context);
                    }
                }
            }
        };
        try {
            await runPipeline(0);
        }
        catch (err) {
            if (err.name === 'AbortError')
                throw err;
            throw new BotHandlerException('Error in bot handler', err, activity);
        }
        return invokeResponse;
    }
}
exports.BotApplication = BotApplication;
