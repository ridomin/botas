import type { CoreActivity, ResourceResponse, ChannelAccount } from './core-activity.js'
import type { BotApplication } from './bot-application.js'

const EMOJI_MAP: Record<string, string> = {
  '👍': 'like',
  '❤️': 'heart',
  '😂': 'laugh',
  '😮': 'surprised',
  '😢': 'sad',
  '😠': 'angry'
}

export class TurnContext {
  constructor(
    public readonly app: BotApplication,
    public readonly activity: CoreActivity
  ) {}

  async send(textOrActivity: string | Partial<CoreActivity>): Promise<ResourceResponse | undefined> {
    const activity: Partial<CoreActivity> = 
      typeof textOrActivity === 'string' 
        ? { type: 'message', text: textOrActivity } 
        : { ...textOrActivity }

    // Copy routing fields
    if (!activity.serviceUrl) activity.serviceUrl = this.activity.serviceUrl
    if (!activity.conversation) activity.conversation = { ...this.activity.conversation }
    if (!activity.from) activity.from = { ...this.activity.recipient }
    if (!activity.recipient) activity.recipient = { ...this.activity.from }
    if (!activity.channelId) activity.channelId = this.activity.channelId

    return await this.app.conversationClient.sendCoreActivityAsync(
      activity.serviceUrl!,
      activity.conversation!.id,
      activity
    )
  }

  async sendTyping(): Promise<void> {
    await this.send({ type: 'typing' })
  }

  async sendTargeted(text: string, recipient: ChannelAccount): Promise<ResourceResponse | undefined> {
    return await this.send({
      type: 'message',
      text,
      recipient,
      isTargeted: true
    })
  }

  async addReaction(emojiOrType: string): Promise<void> {
    const reactionType = EMOJI_MAP[emojiOrType] ?? emojiOrType
    if (!this.activity.id) {
      throw new Error('Cannot add reaction: incoming activity has no id')
    }
    await this.app.conversationClient.addReaction(
      this.activity.serviceUrl,
      this.activity.conversation.id,
      this.activity.id,
      reactionType
    )
  }
}
