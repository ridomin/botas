import type { CoreActivity, ResourceResponse } from './core-activity.js'

export interface BotApplicationOptions {
  clientId?: string
  clientSecret?: string
  tenantId?: string
  managedIdentityClientId?: string
  token?: (scope: string, tenantId: string) => Promise<string>
}

export class TokenManager {
  private cache: Map<string, { token: string; expires: number }> = new Map()

  constructor(private options: BotApplicationOptions) {}

  async getToken(scope: string, tenantId: string = 'common'): Promise<string | undefined> {
    if (this.options.token) {
      return this.options.token(scope, tenantId)
    }

    const clientId = this.options.clientId ?? process.env['CLIENT_ID']
    const clientSecret = this.options.clientSecret ?? process.env['CLIENT_SECRET']
    const tenant = this.options.tenantId ?? process.env['TENANT_ID'] ?? tenantId

    if (!clientId || !clientSecret) {
      return undefined
    }

    const cacheKey = `${clientId}:${tenant}:${scope}`
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expires > Date.now() + 60000) {
      return cached.token
    }

    const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    })

    const response = await fetch(url, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    if (!response.ok) {
      throw new Error(`Failed to acquire token: ${response.status} ${await response.text()}`)
    }

    const data = await response.json() as { access_token: string; expires_in: number }
    this.cache.set(cacheKey, {
      token: data.access_token,
      expires: Date.now() + data.expires_in * 1000,
    })

    return data.access_token
  }
}

export class ConversationClient {
  private tokenManager: TokenManager

  constructor(options: BotApplicationOptions) {
    this.tokenManager = new TokenManager(options)
  }

  async sendCoreActivityAsync(
    serviceUrl: string,
    conversationId: string,
    activity: Partial<CoreActivity>
  ): Promise<ResourceResponse | undefined> {
    // Normalize serviceUrl
    const baseUrl = serviceUrl.endsWith('/') ? serviceUrl : `${serviceUrl}/`
    
    // Truncate conversationId at first ; for URL
    const urlSafeConvId = conversationId.split(';')[0]
    let url = `${baseUrl}v3/conversations/${encodeURIComponent(urlSafeConvId!)}/activities`

    if (activity.isTargeted) {
      url += '?isTargetedActivity=true'
    }

    const token = await this.tokenManager.getToken('https://api.botframework.com/.default')
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Clone activity to remove isTargeted before serialization
    const body = { ...activity }
    delete body.isTargeted

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to send activity: ${response.status} ${errorText}`)
    }

    return (await response.json()) as ResourceResponse
  }

  async addReaction(
    serviceUrl: string,
    conversationId: string,
    activityId: string,
    reactionType: string
  ): Promise<void> {
    const baseUrl = serviceUrl.endsWith('/') ? serviceUrl : `${serviceUrl}/`
    const urlSafeConvId = conversationId.split(';')[0]
    const url = `${baseUrl}v3/conversations/${encodeURIComponent(urlSafeConvId!)}/activities/${encodeURIComponent(activityId)}/reactions`

    const token = await this.tokenManager.getToken('https://api.botframework.com/.default')
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: reactionType }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to add reaction: ${response.status} ${errorText}`)
    }
  }
}
