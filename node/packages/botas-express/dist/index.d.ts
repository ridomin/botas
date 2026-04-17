import { type BotApplicationOptions, type TurnContext, type TurnMiddleware } from 'botas';
export declare class BotApp {
    private readonly bot;
    private readonly server;
    constructor(options?: BotApplicationOptions);
    use(middleware: TurnMiddleware): this;
    on(type: string, handler: (ctx: TurnContext) => Promise<void>): this;
    onInvoke(name: string, handler: (ctx: any) => Promise<any>): this;
    start(port?: number): void;
}
export * from 'botas';
