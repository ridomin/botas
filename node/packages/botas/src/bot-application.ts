import { ConversationClient, type BotApplicationOptions } from './conversation-client.js'
import { TurnContext } from './turn-context.js'
import type { CoreActivity, InvokeResponse } from './core-activity.js'
import type { TurnMiddleware } from './i-turn-middleware.js'

export class BotHandlerException extends Error {
  constructor(message: string, public readonly cause: unknown, public readonly activity: CoreActivity) {
    super(message)
    this.name = 'BotHandlerException'
  }
}

export class BotApplication {
  readonly conversationClient: ConversationClient
  private middleware: TurnMiddleware[] = []
  private handlers: Map<string, (ctx: TurnContext) => Promise<void>> = new Map()
  private invokeHandlers: Map<string, (ctx: TurnContext) => Promise<InvokeResponse>> = new Map()
  
  onActivity?: (ctx: TurnContext) => Promise<void>

  constructor(options: BotApplicationOptions = {}) {
    this.conversationClient = new ConversationClient(options)
  }

  use(middleware: TurnMiddleware): this {
    this.middleware.push(middleware)
    return this
  }

  on(type: string, handler: (ctx: TurnContext) => Promise<void>): this {
    this.handlers.set(type.toLowerCase(), handler)
    return this
  }

  onInvoke(name: string, handler: (ctx: TurnContext) => Promise<InvokeResponse>): this {
    this.invokeHandlers.set(name, handler)
    return this
  }

  async processBody(body: string): Promise<InvokeResponse | undefined> {
    const activity = JSON.parse(body) as CoreActivity
    
    // Basic validation
    if (!activity.type || !activity.serviceUrl || !activity.conversation?.id) {
      throw new Error('Invalid activity: missing required fields (type, serviceUrl, conversation.id)')
    }

    const context = new TurnContext(this, activity)
    let invokeResponse: InvokeResponse | undefined

    const runPipeline = async (index: number): Promise<void> => {
      if (index < this.middleware.length) {
        await this.middleware[index]!(context, () => runPipeline(index + 1))
      } else {
        // Dispatch to handler
        if (this.onActivity) {
          await this.onActivity(context)
        } else if (activity.type.toLowerCase() === 'invoke') {
          const handler = this.invokeHandlers.get(activity.name ?? '')
          if (handler) {
            invokeResponse = await handler(context)
          }
        } else {
          const handler = this.handlers.get(activity.type.toLowerCase())
          if (handler) {
            await handler(context)
          }
        }
      }
    }

    try {
      await runPipeline(0)
    } catch (err: any) {
      if (err.name === 'AbortError') throw err
      throw new BotHandlerException('Error in bot handler', err, activity)
    }

    return invokeResponse
  }
}
