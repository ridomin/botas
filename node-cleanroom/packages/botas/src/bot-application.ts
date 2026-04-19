import type { IncomingMessage, ServerResponse } from 'http';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import type { CoreActivity, ResourceResponse, InvokeResponse } from './core-activity.js';
import type { TurnContext } from './turn-context.js';
import { TurnContext as TurnContextClass } from './turn-context.js';

export type NextTurn = () => Promise<void>;

export type TurnMiddleware = (
  context: TurnContext,
  next: NextTurn
) => Promise<void>;

interface BotApplicationOptions {
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  managedIdentityClientId?: string;
  token?: (scope: string, tenantId: string) => Promise<string>;
}

export class BotApplication {
  private readonly handlers = new Map<string, (ctx: TurnContext) => Promise<void>>();
  private readonly middleware: TurnMiddleware[] = [];
  private onActivityHandler?: (ctx: TurnContext) => Promise<void>;
  private readonly httpClient: globalThis.fetch;
  private readonly options: Required<BotApplicationOptions>;
  private outboundToken = '';
  private tokenExpiry = 0;

  constructor(options: BotApplicationOptions = {}) {
    this.options = {
      clientId: options.clientId ?? process.env.CLIENT_ID ?? '',
      clientSecret: options.clientSecret ?? process.env.CLIENT_SECRET ?? '',
      tenantId: options.tenantId ?? process.env.TENANT_ID ?? 'common',
      managedIdentityClientId: options.managedIdentityClientId ?? process.env.MANAGED_IDENTITY_CLIENT_ID ?? '',
      token: options.token ?? (() => Promise.resolve('')),
    };
    this.httpClient = globalThis.fetch;
  }

  on(type: string, handler: (ctx: TurnContext) => Promise<void>): this {
    this.handlers.set(type.toLowerCase(), handler);
    return this;
  }

  get onActivity(): ((ctx: TurnContext) => Promise<void>) | undefined {
    return this.onActivityHandler;
  }

  set onActivity(value: ((ctx: TurnContext) => Promise<void>) | undefined) {
    this.onActivityHandler = value;
  }

  use(middleware: TurnMiddleware): this {
    this.middleware.push(middleware);
    return this;
  }

  async processAsync(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (this.options.clientId) {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.statusCode = 401;
        res.end();
        return;
      }

      const token = authHeader.slice(7);
      const valid = await this.validateToken(token);
      if (!valid) {
        res.statusCode = 401;
        res.end();
        return;
      }
    }

    await this.processActivityInternal(req, res);
  }

  async processBody(body: string): Promise<InvokeResponse | undefined> {
    const activity = JSON.parse(body) as CoreActivity;
    return this.processActivityObject(activity);
  }

  private async processActivityInternal(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString();

    await this.processActivityObject(JSON.parse(body), res);
  }

  private async processActivityObject(
    activity: CoreActivity,
    res?: ServerResponse
  ): Promise<InvokeResponse | undefined> {
    if (!this.validateRequiredFields(activity)) {
      if (res) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end('{}');
      }
      return undefined;
    }

    if (!this.validateServiceUrl(activity.serviceUrl)) {
      if (res) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end('{}');
      }
      return undefined;
    }

    const turnContext = new TurnContextClass(this, activity);
    const finalHandler = async () => {
      await this.dispatch(turnContext);
    };

    await this.runMiddlewarePipeline(turnContext, finalHandler);

    if (res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end('{}');
    }

    return undefined;
  }

  private async runMiddlewarePipeline(
    context: TurnContext,
    finalHandler: NextTurn
  ): Promise<void> {
    let next = finalHandler;
    for (let i = this.middleware.length - 1; i >= 0; i--) {
      const middleware = this.middleware[i];
      const currentNext = next;
      next = async () => {
        await middleware(context, currentNext);
      };
    }
    await next();
  }

  private async dispatch(context: TurnContext): Promise<void> {
    let handler = this.onActivityHandler;

    if (!handler) {
      handler = this.handlers.get(context.activity.type.toLowerCase());
    }

    if (handler) {
      try {
        await handler(context);
      } catch (err) {
        throw new BotHandlerError(err as Error, context.activity);
      }
    }
  }

  async sendActivityAsync(
    serviceUrl: string,
    conversationId: string,
    activity: Partial<CoreActivity>
  ): Promise<ResourceResponse | undefined> {
    if (!serviceUrl || !conversationId) {
      return undefined;
    }

    const url = this.normalizeServiceUrl(serviceUrl) + 'v3/conversations/' +
      this.truncateConversationId(conversationId) + '/activities';

    const token = await this.getOutboundToken();

    const response = await this.httpClient(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activity),
    });

    if (!response.ok) {
      throw new Error(`Failed to send activity: ${response.status}`);
    }

    return response.json() as Promise<ResourceResponse>;
  }

  private async getOutboundToken(): Promise<string> {
    if (this.outboundToken && Date.now() < this.tokenExpiry - 300000) {
      return this.outboundToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.options.tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      scope: 'https://api.botframework.com/.default',
    });

    const response = await this.httpClient(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const result = await response.json() as {
      access_token: string;
      expires_in: number;
    };

    this.outboundToken = result.access_token;
    this.tokenExpiry = Date.now() + result.expires_in * 1000;

    return this.outboundToken;
  }

  private async validateToken(token: string): Promise<boolean> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString()
      );

      const aud = payload.aud as string;
      const iss = payload.iss as string;
      const tid = payload.tid as string;
      const exp = payload.exp as number;

      if (exp < Date.now() / 1000) return false;

      const validAudiences = [
        this.options.clientId,
        `api://${this.options.clientId}`,
        'https://api.botframework.com',
      ];
      if (!validAudiences.includes(aud)) return false;

      const validIssuers = [
        'https://api.botframework.com',
        `https://sts.windows.net/${tid}/`,
        `https://login.microsoftonline.com/${tid}/v2`,
        `https://login.microsoftonline.com/${tid}/v2.0`,
      ];
      if (!validIssuers.includes(iss)) return false;

      return true;
    } catch {
      return false;
    }
  }

  private validateRequiredFields(activity: CoreActivity): boolean {
    return !!activity.type && !!activity.serviceUrl && !!activity.conversation?.id;
  }

  private validateServiceUrl(serviceUrl: string): boolean {
    try {
      const url = new URL(serviceUrl);
      const host = url.host.toLowerCase();

      if (host === 'localhost' || host === '127.0.0.1') {
        return url.protocol === 'http:' || url.protocol === 'https:';
      }

      const allowedPatterns = [
        'botframework.com',
        'botframework.us',
        'botframework.cn',
        'trafficmanager.net',
      ];

      return allowedPatterns.some((p) => host.endsWith(p)) && url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private normalizeServiceUrl(serviceUrl: string): string {
    serviceUrl = serviceUrl.trimEnd('/');
    if (!serviceUrl.endsWith('/')) serviceUrl += '/';
    return serviceUrl;
  }

  private truncateConversationId(conversationId: string): string {
    const semicolonIndex = conversationId.indexOf(';');
    if (semicolonIndex > 0) {
      conversationId = conversationId.slice(0, semicolonIndex);
    }
    return encodeURIComponent(conversationId);
  }
}

export class BotHandlerError extends Error {
  cause: unknown;
  activity: CoreActivity;

  constructor(cause: unknown, activity: CoreActivity) {
    super('Handler error');
    this.name = 'BotHandlerError';
    this.cause = cause;
    this.activity = activity;
  }
}