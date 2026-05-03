# OTel Bot

Echo bot with **OpenTelemetry** observability — traces, metrics, and logs via the
[Microsoft OpenTelemetry distro](https://www.npmjs.com/package/@microsoft/opentelemetry).

## Quick Start

```bash
npm install
npx tsx index.ts
```

## Local Observability with Aspire Dashboard

Run the [Aspire Dashboard](https://learn.microsoft.com/dotnet/aspire/fundamentals/dashboard/standalone) locally:

```bash
docker run --rm -d --name aspire-dashboard -p 4317:18889 -p 4318:18890 -p 18888:18888 mcr.microsoft.com/dotnet/aspire-dashboard:latest
```

Then start the bot with OTLP export:

```bash
# Copy the example env to .env (the .env file is ignored and must NOT be committed)
# cp .env.example .env
# Start the bot using the .env file
npx tsx --env-file ../../.env index.ts
```

Open <http://localhost:18888> to view traces, logs, and metrics.

## Azure Monitor (Production)

Set the Application Insights connection string and telemetry is routed automatically:

```bash
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=... npx tsx index.ts
```

No code changes needed — the Microsoft distro detects the env var.

## Further Reading

- [Observability guide](../../docs-site/observability.md)
- [specs/README.md](../../../specs/README.md)
