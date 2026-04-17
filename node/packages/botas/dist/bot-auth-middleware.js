"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBotToken = validateBotToken;
exports.botAuthExpress = botAuthExpress;
exports.botAuthHono = botAuthHono;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = require("jwks-rsa");
const TRUSTED_PREFIXES = [
    'https://login.botframework.com/',
    'https://login.microsoftonline.com/'
];
const jwksClients = new Map();
async function getJwksClient(iss, tid) {
    let openIdUrl;
    if (iss === 'https://api.botframework.com') {
        openIdUrl = 'https://login.botframework.com/v1/.well-known/openid-configuration';
    }
    else {
        if (!tid)
            throw new Error('tid claim missing in token');
        openIdUrl = `https://login.microsoftonline.com/${tid}/v2.0/.well-known/openid-configuration`;
    }
    // Validate prefix
    if (!TRUSTED_PREFIXES.some(p => openIdUrl.startsWith(p))) {
        throw new Error(`Untrusted OpenID configuration URL: ${openIdUrl}`);
    }
    if (jwksClients.has(openIdUrl)) {
        return jwksClients.get(openIdUrl);
    }
    const response = await fetch(openIdUrl);
    const config = await response.json();
    const client = new jwks_rsa_1.JwksClient({ jwksUri: config.jwks_uri });
    jwksClients.set(openIdUrl, client);
    return client;
}
async function validateBotToken(token, clientId) {
    if (!clientId)
        return; // Bypass when no clientId
    const decoded = jsonwebtoken_1.default.decode(token, { complete: true });
    if (!decoded)
        throw new Error('Invalid token format');
    const jwksClient = await getJwksClient(decoded.payload.iss, decoded.payload.tid);
    const key = await jwksClient.getSigningKey(decoded.header.kid);
    const publicKey = key.getPublicKey();
    const expectedAud = [clientId, `api://${clientId}`, 'https://api.botframework.com'];
    return new Promise((resolve, reject) => {
        jsonwebtoken_1.default.verify(token, publicKey, {
            audience: expectedAud,
            issuer: [
                'https://api.botframework.com',
                `https://sts.windows.net/${decoded.payload.tid}/`,
                `https://login.microsoftonline.com/${decoded.payload.tid}/v2`,
                `https://login.microsoftonline.com/${decoded.payload.tid}/v2.0`
            ]
        }, (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
function botAuthExpress(clientId) {
    const cid = clientId ?? process.env['CLIENT_ID'];
    return async (req, res, next) => {
        if (!cid)
            return next();
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).send('Missing Authorization header');
        }
        const token = authHeader.split(' ')[1];
        try {
            await validateBotToken(token, cid);
            next();
        }
        catch (err) {
            res.status(401).send(`Authentication failed: ${err.message}`);
        }
    };
}
function botAuthHono(clientId) {
    const cid = clientId ?? process.env['CLIENT_ID'];
    return async (c, next) => {
        if (!cid)
            return await next();
        const authHeader = c.req.header('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return c.text('Missing Authorization header', 401);
        }
        const token = authHeader.split(' ')[1];
        try {
            await validateBotToken(token, cid);
            await next();
        }
        catch (err) {
            return c.text(`Authentication failed: ${err.message}`, 401);
        }
    };
}
