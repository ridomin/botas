// OpenTelemetry setup — must be imported before any other modules.
// Uses the Microsoft OpenTelemetry distro for single-call onboarding
// with auto-instrumentation for HTTP, Azure SDK, and database clients.
//
// Export targets are configured via environment variables:
//   APPLICATIONINSIGHTS_CONNECTION_STRING → Azure Monitor (Application Insights)
//   OTEL_EXPORTER_OTLP_ENDPOINT          → OTLP collector (Aspire Dashboard, Jaeger, Grafana)
//
// If neither is set, telemetry defaults to Console output.
//
// To view traces locally with Aspire Dashboard:
//   docker run -p 4317:4317 -p 18888:18888 mcr.microsoft.com/dotnet/aspire-dashboard:latest
//   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 OTEL_SERVICE_NAME=otel-bot npx tsx index.ts

import { diag } from '@opentelemetry/api'

// Suppress diag "logger will be overwritten" warnings from the Microsoft distro.
// The distro's NodeSDK calls diag.setLogger() which warns when overwriting.
// We monkey-patch setLogger to always suppress the override message.
const originalSetLogger = diag.setLogger.bind(diag)
diag.setLogger = (logger, optionsOrLogLevel) => {
  if (typeof optionsOrLogLevel === 'number') {
    return originalSetLogger(logger, { logLevel: optionsOrLogLevel, suppressOverrideMessage: true })
  }
  return originalSetLogger(logger, { ...optionsOrLogLevel, suppressOverrideMessage: true })
}

import { useMicrosoftOpenTelemetry } from '@microsoft/opentelemetry'

// Ensure OTEL resource contains service.name so exporters (Aspire) display the expected resource.
// Prefer explicit environment variable if provided; otherwise derive from OTEL_SERVICE_NAME fallback.
process.env.OTEL_RESOURCE_ATTRIBUTES = process.env.OTEL_RESOURCE_ATTRIBUTES ?? `service.name=${process.env.OTEL_SERVICE_NAME || 'otel-bot-node'}`

useMicrosoftOpenTelemetry({
  enableConsoleExporters: true,
  instrumentationOptions: {
    http: {
      enabled: true,
    },
    azureSdk: {
      enabled: true,
    }
  },
})
