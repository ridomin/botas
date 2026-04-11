// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Activity, ResourceResponse } from '../schema/activity.js'
import type { ITurnMiddleware } from '../middleware/i-turn-middleware.js'
import { ConversationClient } from '../clients/conversation-client.js'
import { UserTokenClient } from '../clients/user-token-client.js'
import { TokenManager } from '../auth/token-manager.js'
import type { BotApplicationOptions } from './bot-application-options.js'
import { getLogger } from '../logging/logger.js'

/** A function that handles a specific activity type. */
export type ActivityHandler = (activity: Activity) => Promise<void>

/** Wraps an exception thrown by an activity handler with the originating activity. */
export class BotHandlerException extends Error {
  constructor (
    message: string,
    public readonly cause: unknown,
    public readonly activity: Activity
  ) {
    super(message)
    this.name = 'BotHandlerException'
  }
}

/**
 * Core bot application that processes incoming Bot Framework activities.
 *
 * Web-server-agnostic — use {@link processAsync} with Express (or any
 * Node.js `http.Server`) and {@link processBody} with frameworks that manage
 * their own HTTP response lifecycle (e.g. Hono).
 *
 * @example
 * ```ts
 * const bot = new BotApplication({ clientId: '...', clientSecret: '...' });
 *
 * bot.on('message', async ({ activity, send }) => {
 *   await send(`You said: ${activity.text}`);
 * });
 * ```
 */
export class BotApplication {
  /** Resolved options for this application instance. */
  readonly options: BotApplicationOptions

  /** Client for sending, updating, and deleting activities via the Bot Framework API. */
  readonly conversationClient: ConversationClient

  /** Client for OAuth token operations via the Bot Framework token service. */
  readonly userTokenClient: UserTokenClient

  private readonly middlewares: ITurnMiddleware[] = []
  private readonly handlers = new Map<string, ActivityHandler>()
  private readonly tokenManager: TokenManager

  constructor (options: BotApplicationOptions = {}) {
    this.options = options
    this.tokenManager = new TokenManager(options)
    const tokenProvider = () =>
      this.tokenManager.getBotToken().then((t) => {
        if (!t) throw new Error('No credentials configured — set CLIENT_ID and CLIENT_SECRET (or use managed identity)')
        return t
      })
    this.conversationClient = new ConversationClient(tokenProvider)
    this.userTokenClient = new UserTokenClient(tokenProvider)
  }

  /**
   * Register a handler for a given activity type.
   *
   * Only one handler per type is supported; registering the same type twice
   * replaces the previous handler.
   *
   * @param type - Activity type string (e.g. `"message"`, `"conversationUpdate"`).
   * @param handler - Async function called with the turn context.
   * @returns `this` for method chaining.
   */
  on (type: string, handler: ActivityHandler): this {
    this.handlers.set(type, handler)
    return this
  }

  /**
   * Add a middleware to the turn processing pipeline.
   *
   * Middleware runs in registration order before the activity handler.
   *
   * @returns `this` for method chaining.
   */
  use (middleware: ITurnMiddleware): this {
    this.middlewares.push(middleware)
    return this
  }

  /**
   * Process an incoming HTTP request (Express / Node.js `http.Server`).
   *
   * Reads the request body, validates the activity, runs the middleware
   * pipeline, and writes a `200 {}` response. Writes `500` on error.
   */
  async processAsync (req: IncomingMessage, res: ServerResponse): Promise<void> {
    getLogger().debug('Start processing HTTP request for activity')
    try {
      const body = await readBody(req)
      await this.processBody(body)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{}')
    } catch {
      res.writeHead(500)
      res.end('Internal server error')
    }
  }

  /**
   * Process a raw JSON request body without touching the HTTP layer.
   *
   * Use this with frameworks that manage their own response lifecycle (e.g.
   * Hono), where writing to `ServerResponse` directly would cause issues.
   */
  async processBody (body: string): Promise<void> {
    const activity = JSON.parse(body) as Activity
    assertActivity(activity)
    getLogger().info('Activity received: type=%s id=%s serviceUrl=%s', activity.type, activity.id, activity.serviceUrl)
    getLogger().trace('Received activity: %s', body)
    try {
      await this.runPipelineAsync(activity)
      getLogger().info('Finished processing activity: id=%s', activity.id)
    } catch (err) {
      getLogger().error('Error processing activity: id=%s', activity.id, err)
      throw err
    }
  }

  /**
   * Proactively send an activity to a conversation.
   *
   * @param serviceUrl - Bot Framework service URL.
   * @param conversationId - Target conversation ID.
   * @param activity - Activity payload to send.
   */
  async sendActivityAsync (
    serviceUrl: string,
    conversationId: string,
    activity: Partial<Activity>
  ): Promise<ResourceResponse | undefined> {
    return this.conversationClient.sendActivityAsync(serviceUrl, conversationId, activity)
  }

  /** @internal Dispatch the activity to its registered handler. */
  protected async handleActivityAsync (activity: Activity): Promise<void> {
    const handler = this.handlers.get(activity.type)
    if (handler) {
      try {
        await handler(activity)
      } catch (err) {
        throw new BotHandlerException(
          `Handler for "${activity.type}" threw an error`,
          err,
          activity
        )
      }
    }
  }

  private async runPipelineAsync (activity: Activity): Promise<void> {
    let index = 0
    const next = async (): Promise<void> => {
      if (index < this.middlewares.length) {
        await this.middlewares[index++].onTurnAsync(this, activity, next)
      } else {
        await this.handleActivityAsync(activity)
      }
    }
    await next()
  }
}

function assertActivity (value: unknown): asserts value is Activity {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Activity must be a JSON object')
  }
  const a = value as Record<string, unknown>
  if (typeof a['type'] !== 'string' || !a['type']) {
    throw new Error('Activity missing required field: type')
  }
  if (typeof a['serviceUrl'] !== 'string' || !a['serviceUrl']) {
    throw new Error('Activity missing required field: serviceUrl')
  }
  if (
    typeof a['conversation'] !== 'object' ||
    a['conversation'] === null ||
    typeof (a['conversation'] as Record<string, unknown>)['id'] !== 'string' ||
    !(a['conversation'] as Record<string, unknown>)['id']
  ) {
    throw new Error('Activity missing required field: conversation.id')
  }
}

function readBody (req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}
