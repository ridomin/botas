import { BotApp } from 'botas-express'

const app = new BotApp()

app.on('message', async (ctx) => {
  console.log(`Received: ${ctx.activity.text}`)
  await ctx.send(`You said: ${ctx.activity.text}`)
})

app.start()
