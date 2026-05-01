// Echo Bot — minimal Deno sample using @botas/core from JSR
// Run: deno run --allow-net --allow-env main.ts

import { BotApplication, validateBotToken, BotAuthError } from 'jsr:@botas/core'

const bot = new BotApplication()

bot.on('message', async (ctx) => {
  await ctx.send(`You said: ${ctx.activity.text}`)
})

bot.on('conversationUpdate', async (ctx) => {
  console.log('conversation update', ctx.activity.properties?.['membersAdded'])
})

const PORT = Number(Deno.env.get('PORT') ?? '3978')

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url)

  if (req.method === 'POST' && url.pathname === '/api/messages') {
    const clientId = Deno.env.get('CLIENT_ID')
    if (clientId) {
      const header = req.headers.get('authorization') ?? undefined
      try {
        await validateBotToken(header, clientId)
      } catch (err) {
        if (err instanceof BotAuthError) {
          return new Response(err.message, { status: 401 })
        }
        throw err
      }
    }

    const body = await req.text()
    await bot.processBody(body)
    return Response.json({})
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return Response.json({ status: 'ok' })
  }

  return new Response('Not Found', { status: 404 })
})

console.log(`Listening on http://localhost:${PORT}/api/messages`)
