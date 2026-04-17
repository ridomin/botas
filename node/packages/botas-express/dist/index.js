"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotApp = void 0;
const express_1 = __importDefault(require("express"));
const botas_1 = require("botas");
class BotApp {
    bot;
    server = (0, express_1.default)();
    constructor(options = {}) {
        this.bot = new botas_1.BotApplication(options);
        this.server.use(express_1.default.json());
        // Default routes
        this.server.get('/health', (_req, res) => res.json({ status: 'ok' }));
        this.server.get('/', (_req, res) => {
            const clientId = options.clientId ?? process.env['CLIENT_ID'] ?? 'unknown';
            res.send(`Bot ${clientId} is running`);
        });
    }
    use(middleware) {
        this.bot.use(middleware);
        return this;
    }
    on(type, handler) {
        this.bot.on(type, handler);
        return this;
    }
    onInvoke(name, handler) {
        this.bot.onInvoke(name, handler);
        return this;
    }
    start(port) {
        const p = port ?? Number(process.env['PORT'] ?? 3978);
        this.server.post('/api/messages', (0, botas_1.botAuthExpress)(), async (req, res) => {
            try {
                const response = await this.bot.processBody(JSON.stringify(req.body));
                if (response) {
                    res.status(response.status).json(response.body);
                }
                else {
                    res.status(200).json({});
                }
            }
            catch (err) {
                console.error('Error processing activity:', err);
                res.status(500).send('Internal Server Error');
            }
        });
        this.server.listen(p, () => {
            console.log(`Bot is listening on port ${p}`);
        });
    }
}
exports.BotApp = BotApp;
__exportStar(require("botas"), exports);
