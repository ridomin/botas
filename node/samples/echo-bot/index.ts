// Echo Bot — minimal botas-express sample
// Run: npx tsx index.ts

import { BotApp } from 'botas-express'

// new BotApp()
//   .on('message', 
//     ctx => ctx.send(`You said: ${ctx.activity.text}`))
//   .start()

const app = new BotApp()

app.on('message', async ctx => {
    await ctx.send(`You said: ${ctx.activity.text}`)
  }
)

app.start()
