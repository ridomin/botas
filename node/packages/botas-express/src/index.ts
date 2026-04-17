import express, { type Request, type Response } from 'express'
import { BotApplication, botAuthExpress, type BotApplicationOptions, type TurnContext, type TurnMiddleware } from 'botas'

export class BotApp {
  private readonly bot: BotApplication
  private readonly server = express()

  constructor(options: BotApplicationOptions = {}) {
    this.bot = new BotApplication(options)
    this.server.use(express.json())
    
    // Default routes
    this.server.get('/health', (_req, res) => res.json({ status: 'ok' }))
    this.server.get('/', (_req, res) => {
      const clientId = options.clientId ?? process.env['CLIENT_ID'] ?? 'unknown'
      res.send(`Bot ${clientId} is running`)
    })
  }

  use(middleware: TurnMiddleware): this {
    this.bot.use(middleware)
    return this
  }

  on(type: string, handler: (ctx: TurnContext) => Promise<void>): this {
    this.bot.on(type, handler)
    return this
  }

  onInvoke(name: string, handler: (ctx: any) => Promise<any>): this {
    this.bot.onInvoke(name, handler)
    return this
  }

  start(port?: number): void {
    const p = port ?? Number(process.env['PORT'] ?? 3978)
    
    this.server.post('/api/messages', botAuthExpress(), async (req: Request, res: Response) => {
      try {
        const response = await this.bot.processBody(JSON.stringify(req.body))
        if (response) {
          res.status(response.status).json(response.body)
        } else {
          res.status(200).json({})
        }
      } catch (err) {
        console.error('Error processing activity:', err)
        res.status(500).send('Internal Server Error')
      }
    })

    this.server.listen(p, () => {
      console.log(`Bot is listening on port ${p}`)
    })
  }
}

export * from 'botas'
