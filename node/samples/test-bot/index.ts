// Test Bot — feature-rich bot for E2E/Playwright testing
// Run: npx tsx index.ts

import { BotApp } from 'botas-express'

console.log('Starting Node.js test-bot...')

const app = new BotApp()

app.on('message', async (ctx) => {
  console.log('📨 Received message:', ctx.activity.text)
  const text = (ctx.activity.text ?? '').trim()
  if (text.toLowerCase() === 'card') {
    await ctx.send({
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          version: '1.5',
          body: [
            { type: 'TextBlock', text: 'Invoke Test Card', weight: 'bolder' },
            { type: 'TextBlock', text: 'Click the button to trigger an invoke.' }
          ],
          actions: [{
            type: 'Action.Execute',
            title: 'Submit',
            verb: 'test',
            data: { source: 'e2e' }
          }]
        }
      }]
    })
  } else {
    await ctx.send(`You said: ${ctx.activity.text}`)
  }
})

app.onInvoke('adaptiveCard/action', async (ctx) => {
  console.log('🔔 Invoke: adaptiveCard/action')
  return {
    status: 200,
    body: {
      statusCode: 200,
      type: 'application/vnd.microsoft.card.adaptive',
      value: {
        type: 'AdaptiveCard',
        version: '1.5',
        body: [
          { type: 'TextBlock', text: '✅ Invoke received!', weight: 'bolder' }
        ]
      }
    }
  }
})

app.onInvoke('test/echo', async (ctx) => {
  console.log('🔔 Invoke: test/echo')
  return { status: 200, body: ctx.activity.value }
})

app.start()