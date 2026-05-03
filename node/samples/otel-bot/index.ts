// OTel Bot — echo bot with OpenTelemetry observability
// Run: npx tsx index.ts
//
// OTel setup must come before any other imports so auto-instrumentation
// hooks into HTTP and Azure SDK modules at load time.
//
// View traces locally with the Aspire Dashboard:
//   docker run -p 4317:4317 -p 18888:18888 mcr.microsoft.com/dotnet/aspire-dashboard:latest
//   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 OTEL_SERVICE_NAME=otel-bot-node npx tsx index.ts
//   Open http://localhost:18888 to see traces, logs, and metrics.

import './otel-setup.js'

console.log('otel-bot starting: otel-setup imported')

import { BotApp } from 'botas-express'
import { configure, consoleLogger, createOtelLogger } from 'botas-core'

console.log('creating logger')
configure(createOtelLogger() ?? consoleLogger)

console.log('instantiating BotApp')
const app = new BotApp()

app.on('message', async (ctx) => {
  console.log('received message activity with text:', ctx.activity.text)
  await ctx.send(`You said: ${ctx.activity.text}`)
})

console.log('starting app')
const server = app.start()
console.log('app.start returned server and should be listening')
// keep a reference so Node won't exit if express misbehaves
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _serverRef = server
