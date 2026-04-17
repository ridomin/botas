"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationClient = exports.TokenManager = void 0;
class TokenManager {
    options;
    cache = new Map();
    constructor(options) {
        this.options = options;
    }
    async getToken(scope, tenantId = 'common') {
        if (this.options.token) {
            return this.options.token(scope, tenantId);
        }
        const clientId = this.options.clientId ?? process.env['CLIENT_ID'];
        const clientSecret = this.options.clientSecret ?? process.env['CLIENT_SECRET'];
        const tenant = this.options.tenantId ?? process.env['TENANT_ID'] ?? tenantId;
        if (!clientId || !clientSecret) {
            return undefined;
        }
        const cacheKey = `${clientId}:${tenant}:${scope}`;
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expires > Date.now() + 60000) {
            return cached.token;
        }
        const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
        const body = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            scope,
        });
        const response = await fetch(url, {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        if (!response.ok) {
            throw new Error(`Failed to acquire token: ${response.status} ${await response.text()}`);
        }
        const data = await response.json();
        this.cache.set(cacheKey, {
            token: data.access_token,
            expires: Date.now() + data.expires_in * 1000,
        });
        return data.access_token;
    }
}
exports.TokenManager = TokenManager;
class ConversationClient {
    tokenManager;
    constructor(options) {
        this.tokenManager = new TokenManager(options);
    }
    async sendCoreActivityAsync(serviceUrl, conversationId, activity) {
        // Normalize serviceUrl
        const baseUrl = serviceUrl.endsWith('/') ? serviceUrl : `${serviceUrl}/`;
        // Truncate conversationId at first ; for URL
        const urlSafeConvId = conversationId.split(';')[0];
        let url = `${baseUrl}v3/conversations/${encodeURIComponent(urlSafeConvId)}/activities`;
        if (activity.isTargeted) {
            url += '?isTargetedActivity=true';
        }
        const token = await this.tokenManager.getToken('https://api.botframework.com/.default');
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        // Clone activity to remove isTargeted before serialization
        const body = { ...activity };
        delete body.isTargeted;
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to send activity: ${response.status} ${errorText}`);
        }
        return (await response.json());
    }
    async addReaction(serviceUrl, conversationId, activityId, reactionType) {
        const baseUrl = serviceUrl.endsWith('/') ? serviceUrl : `${serviceUrl}/`;
        const urlSafeConvId = conversationId.split(';')[0];
        const url = `${baseUrl}v3/conversations/${encodeURIComponent(urlSafeConvId)}/activities/${encodeURIComponent(activityId)}/reactions`;
        const token = await this.tokenManager.getToken('https://api.botframework.com/.default');
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ type: reactionType }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to add reaction: ${response.status} ${errorText}`);
        }
    }
}
exports.ConversationClient = ConversationClient;
