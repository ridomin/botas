import type { ChannelAccount, CoreActivity, Conversation } from './core-activity.js'

export class CoreActivityBuilder {
  private activity: Partial<CoreActivity> = {
    type: 'message',
    entities: [],
    attachments: []
  }

  withType(type: string): this {
    this.activity.type = type
    return this
  }

  withText(text: string): this {
    this.activity.text = text
    return this
  }

  withRecipient(recipient: ChannelAccount, isTargeted?: boolean): this {
    this.activity.recipient = { ...recipient }
    if (isTargeted !== undefined) {
      this.activity.isTargeted = isTargeted
    }
    return this
  }

  withFrom(from: ChannelAccount): this {
    this.activity.from = { ...from }
    return this
  }

  withConversation(conversation: Conversation): this {
    this.activity.conversation = { ...conversation }
    return this
  }

  withServiceUrl(serviceUrl: string): this {
    this.activity.serviceUrl = serviceUrl
    return this
  }

  withConversationReference(reference: CoreActivity): this {
    this.activity.serviceUrl = reference.serviceUrl
    this.activity.conversation = { ...reference.conversation }
    this.activity.from = { ...reference.recipient }
    this.activity.recipient = { ...reference.from }
    this.activity.channelId = reference.channelId
    return this
  }

  addEntity(entity: any): this {
    this.activity.entities?.push(entity)
    return this
  }

  addAttachment(attachment: any): this {
    this.activity.attachments?.push(attachment)
    return this
  }

  withValue(value: any): this {
    this.activity.value = value
    return this
  }

  withName(name: string): this {
    this.activity.name = name
    return this
  }

  build(): Partial<CoreActivity> {
    return { ...this.activity }
  }
}
