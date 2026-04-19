import type { CoreActivity, ResourceResponse } from './core-activity.js';
import type { BotApplication } from './bot-application.js';

export class TurnContext {
  readonly activity: CoreActivity;
  readonly app: BotApplication;

  constructor(app: BotApplication, activity: CoreActivity) {
    this.app = app;
    this.activity = activity;
  }

  async send(text: string): Promise<ResourceResponse | undefined>;
  async send(activity: Partial<CoreActivity>): Promise<ResourceResponse | undefined>;
  async send(
    textOrActivity: string | Partial<CoreActivity>
  ): Promise<ResourceResponse | undefined> {
    if (typeof textOrActivity === 'string') {
      const reply: Partial<CoreActivity> = {
        type: 'message',
        text: textOrActivity,
        from: this.activity.recipient,
        recipient: this.activity.from,
        conversation: this.activity.conversation,
      };
      return this.send(reply);
    }

    const reply: Partial<CoreActivity> = {
      ...textOrActivity,
      serviceUrl: textOrActivity.serviceUrl ?? this.activity.serviceUrl,
      conversation: textOrActivity.conversation ?? this.activity.conversation,
      from: textOrActivity.from ?? this.activity.recipient,
      recipient: textOrActivity.recipient ?? this.activity.from,
    };

    return this.app.sendActivityAsync(
      this.activity.serviceUrl,
      this.activity.conversation.id,
      reply as CoreActivity
    );
  }

  async sendTyping(): Promise<void> {
    const typing: Partial<CoreActivity> = {
      type: 'typing',
      from: this.activity.recipient,
      recipient: this.activity.from,
      conversation: this.activity.conversation,
    };

    await this.app.sendActivityAsync(
      this.activity.serviceUrl,
      this.activity.conversation.id,
      typing as CoreActivity
    );
  }
}