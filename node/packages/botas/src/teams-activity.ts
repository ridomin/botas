import type { CoreActivity, ChannelAccount } from './core-activity.js'
import type { TurnContext } from './turn-context.js'
import type { NextTurn } from './i-turn-middleware.js'
import { CoreActivityBuilder } from './core-activity-builder.js'

export interface TeamsChannelData {
  tenant?: { id: string }
  notification?: { alert?: boolean }
  [key: string]: any
}

export class TeamsActivityBuilder extends CoreActivityBuilder {
  private teamsActivity: Partial<CoreActivity> = {}

  constructor() {
    super()
  }

  override withConversationReference(reference: CoreActivity): this {
    super.withConversationReference(reference)
    return this
  }

  withChannelData(channelData: TeamsChannelData): this {
    this.teamsActivity.channelData = channelData
    return this
  }

  addMention(mentioned: ChannelAccount, text?: string): this {
    const mentionText = text ?? `<at>${mentioned.name ?? 'User'}</at>`
    const currentText = (this.build().text ?? '')
    this.withText(`${currentText} ${mentionText}`.trim())
    
    this.addEntity({
      type: 'mention',
      mentioned: { ...mentioned },
      text: mentionText
    })
    return this
  }

  addAdaptiveCardAttachment(card: any): this {
    this.addAttachment({
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: card
    })
    return this
  }

  withSuggestedActions(suggestedActions: { actions: any[] }): this {
    this.teamsActivity.suggestedActions = suggestedActions
    return this
  }

  override build(): Partial<CoreActivity> {
    const base = super.build()
    return { ...base, ...this.teamsActivity }
  }
}

export async function removeMentionMiddleware(context: TurnContext, next: NextTurn): Promise<void> {
  const activity = context.activity
  if (activity.type === 'message' && activity.text && activity.entities) {
    const botMention = activity.entities.find(
      (e) => e.type === 'mention' && e.mentioned?.id === activity.recipient.id
    )
    if (botMention) {
      const mentionText = botMention.text
      if (mentionText) {
        activity.text = activity.text.replace(mentionText, '').trim()
      }
    }
  }
  await next()
}
