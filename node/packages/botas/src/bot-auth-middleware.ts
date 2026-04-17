import jwt from 'jsonwebtoken'
import { JwksClient } from 'jwks-rsa'
import type { Request, Response, NextFunction } from 'express'

const TRUSTED_PREFIXES = [
  'https://login.botframework.com/',
  'https://login.microsoftonline.com/'
]

const jwksClients: Map<string, JwksClient> = new Map()

async function getJwksClient(iss: string, tid?: string): Promise<JwksClient> {
  let openIdUrl: string
  if (iss === 'https://api.botframework.com') {
    openIdUrl = 'https://login.botframework.com/v1/.well-known/openid-configuration'
  } else {
    if (!tid) throw new Error('tid claim missing in token')
    openIdUrl = `https://login.microsoftonline.com/${tid}/v2.0/.well-known/openid-configuration`
  }

  // Validate prefix
  if (!TRUSTED_PREFIXES.some(p => openIdUrl.startsWith(p))) {
    throw new Error(`Untrusted OpenID configuration URL: ${openIdUrl}`)
  }

  if (jwksClients.has(openIdUrl)) {
    return jwksClients.get(openIdUrl)!
  }

  const response = await fetch(openIdUrl)
  const config = await response.json() as { jwks_uri: string }
  
  const client = new JwksClient({ jwksUri: config.jwks_uri })
  jwksClients.set(openIdUrl, client)
  return client
}

export async function validateBotToken(token: string, clientId?: string): Promise<void> {
  if (!clientId) return // Bypass when no clientId

  const decoded = jwt.decode(token, { complete: true }) as { 
    header: { kid: string }, 
    payload: { iss: string, aud: string, tid?: string } 
  }
  
  if (!decoded) throw new Error('Invalid token format')

  const jwksClient = await getJwksClient(decoded.payload.iss, decoded.payload.tid)
  const key = await jwksClient.getSigningKey(decoded.header.kid)
  const publicKey = key.getPublicKey()

  const expectedAud = [clientId, `api://${clientId}`, 'https://api.botframework.com']
  
  return new Promise((resolve, reject) => {
    jwt.verify(token, publicKey, {
      audience: expectedAud as any,
      issuer: [
        'https://api.botframework.com',
        `https://sts.windows.net/${decoded.payload.tid}/`,
        `https://login.microsoftonline.com/${decoded.payload.tid}/v2`,
        `https://login.microsoftonline.com/${decoded.payload.tid}/v2.0`
      ]
    }, (err: any) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

export function botAuthExpress(clientId?: string) {
  const cid = clientId ?? process.env['CLIENT_ID']
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!cid) return next()

    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).send('Missing Authorization header')
    }

    const token = authHeader.split(' ')[1]!
    try {
      await validateBotToken(token, cid)
      next()
    } catch (err) {
      res.status(401).send(`Authentication failed: ${(err as Error).message}`)
    }
  }
}

export function botAuthHono(clientId?: string) {
  const cid = clientId ?? process.env['CLIENT_ID']
  return async (c: any, next: () => Promise<void>) => {
    if (!cid) return await next()

    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.text('Missing Authorization header', 401)
    }

    const token = authHeader.split(' ')[1]!
    try {
      await validateBotToken(token, cid)
      await next()
    } catch (err) {
      return c.text(`Authentication failed: ${(err as Error).message}`, 401)
    }
  }
}
