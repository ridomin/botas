import type { Request, Response, NextFunction } from 'express';
export declare function validateBotToken(token: string, clientId?: string): Promise<void>;
export declare function botAuthExpress(clientId?: string): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare function botAuthHono(clientId?: string): (c: any, next: () => Promise<void>) => Promise<any>;
