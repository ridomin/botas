export { BotApplication, type BotApplicationOptions } from './bot-application.js';
export { TurnContext } from './turn-context.js';
export type {
  CoreActivity,
  ChannelAccount,
  Conversation,
  Entity,
  Attachment,
  ResourceResponse,
  InvokeResponse,
} from './core-activity.js';
export type { TurnMiddleware, NextTurn } from './bot-application.js';
export { BotHandlerError } from './bot-application.js';

export function removeMentionMiddleware(): TurnMiddleware {
  return async (context, next) => {
    if (context.activity.type === 'message' && context.activity.text) {
      context.activity.text = context.activity.text.replace(/<at>\s*<\/at>/g, '');
    }
    await next();
  };
}