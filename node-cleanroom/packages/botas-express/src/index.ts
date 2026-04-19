import express, { Application, Request, Response } from 'express';
import type { BotApplication } from 'botas';

export class BotApp {
  private readonly bot: BotApplication;
  private readonly app: Application;

  constructor() {
    this.bot = new BotApplication();
    this.app = express();
    this.app.use(express.json({ limit: '1mb' }));
  }

  on(type: string, handler: (ctx: import('botas').TurnContext) => Promise<void>): this {
    this.bot.on(type, handler);
    return this;
  }

  use(
    middleware: import('botas').TurnMiddleware
  ): this {
    this.bot.use(middleware);
    return this;
  }

  get onActivity():
    | ((ctx: import('botas').TurnContext) => Promise<void>)
    | undefined {
    return this.bot.onActivity;
  }

  set onActivity(
    value:
      | ((ctx: import('botas').TurnContext) => Promise<void>)
      | undefined
  ) {
    this.bot.onActivity = value;
  }

  start(port?: number): void {
    const listenPort = port ?? Number(process.env.PORT ?? 3978);

    this.app.post('/api/messages', async (req: Request, res: Response) => {
      await this.bot.processAsync(req, res);
    });

    this.app.get('/', async (req: Request, res: Response) => {
      const clientId = process.env.CLIENT_ID;
      res.send(`Bot ${clientId ?? '(no auth)'} is running`);
    });

    this.app.get('/health', async (req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    this.app.listen(listenPort, () => {
      console.log(`Bot listening on port ${listenPort}`);
    });
  }
}