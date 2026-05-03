# Decision: Auth & ConversationClient Spans (.NET)

**Author:** Amy (NET Dev)  
**Date:** 2025-07-17  
**Status:** Implemented  
**PR:** 3+4 combined (observability spec)

## Context

The observability spec requires three span types for auth and outbound calls:
- `botas.auth.inbound` — inbound JWT validation
- `botas.auth.outbound` — outbound token acquisition  
- `botas.conversation_client` — outbound activity sends

## Decisions

### 1. `botas.auth.inbound` — NOT added for .NET (intentional difference)

In .NET, inbound JWT validation is handled entirely by ASP.NET Core's authentication middleware (`Microsoft.Identity.Web` / `AddBotAuthentication()`). This middleware already emits its own spans when OpenTelemetry is configured for ASP.NET Core (`AddAspNetCoreInstrumentation()`).

Adding a botas-level wrapper would either:
- Duplicate framework telemetry (confusing traces)
- Require intercepting framework internals (fragile)

**Decision:** Document as .NET intentional difference. Node.js and Python should add `botas.auth.inbound` in their custom JWT validation code.

### 2. `auth.cache_hit` defaults to `false`

Microsoft.Identity.Web's `IAuthorizationHeaderProvider.CreateAuthorizationHeaderForAppAsync` doesn't expose whether the token came from cache. The tag is set to `false` as a default. Future versions of MSAL may expose this.

### 3. ConversationClient span placement

The span starts AFTER `ValidateServiceUrl()` — SSRF validation is a precondition, not part of the outbound call. This keeps the span focused on the actual HTTP round-trip.

### 4. Error recording pattern

Used `catch (Exception ex) when (ccActivity is not null)` in ConversationClient to record error status only when a span listener is active, avoiding catch block overhead in the common no-OTel case.

# Decision: Aspire OTLP protocol for local development

Date: 2026-05-03

Summary
-------
Aspire Dashboard (mcr.microsoft.com/dotnet/aspire-dashboard:latest) supports OTLP via both gRPC and HTTP/protobuf. For local development we recommend using gRPC (OTEL_EXPORTER_OTLP_PROTOCOL=grpc) on host port 4317. HTTP/protobuf is available on host port 4318 as a fallback.

Evidence
--------
- Container logs show:
  - "OTLP/gRPC listening on: http://[::]:18889"
  - "OTLP/HTTP listening on: http://[::]:18890"
- Docker maps container ports 18889->4317 and 18890->4318 (docker port output).
- Node and Python samples in the repo instruct setting `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317` and the spec notes `OTEL_EXPORTER_OTLP_PROTOCOL` defaults to `grpc`.

Recommendation
--------------
- Default to OTLP/gRPC for local Aspire usage: set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317` and (optionally) `OTEL_EXPORTER_OTLP_PROTOCOL=grpc`.
- If your runtime doesn't support gRPC, set `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` and point `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`.
- Update local dev docs to clarify the two host ports and example docker run:
  - docker run -p 4317:4317 -p 4318:4318 -p 18888:18888 mcr.microsoft.com/dotnet/aspire-dashboard:latest

Follow-ups
----------
- Fry: verify node sample emits metrics to Aspire when running with the recommended env vars and report any mismatches.
- Add a short note to `docs-site/observability.md` clarifying port -> protocol mapping.

### 2026-05-02T22:45:45-07:00: User directive
**By:** ridomin (via Copilot)

**What:** Save the OTEL/Aspire runbook and follow it.

Runbook (summary):

Aspire expects OTLP/gRPC (preferred) on host port 4317 (container internal 18889) or OTLP/HTTP (protobuf) on host port 4318 (container internal 18890). Recommended steps to reproduce and use:

1) Start Aspire:
   docker run --rm -d --name aspire-dashboard -p 4317:18889 -p 4318:18890 -p 18888:18888 mcr.microsoft.com/dotnet/aspire-dashboard:latest
   docker logs -f aspire-dashboard
   UI: http://localhost:18888

2) Configure Node sample (.env overrides):
   Prefer gRPC:
     OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
     OTEL_EXPORTER_OTLP_PROTOCOL=grpc
   Or HTTP/protobuf:
     OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
     OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
   Enable debug logs if needed: OTEL_LOG_LEVEL=debug

3) Run the sample:
   cd node/samples/otel-bot
   npx tsx --env-file ../../.env index.ts

4) Verify:
   - Watch Aspire logs for ingestion messages.
   - Open Aspire UI to confirm metrics.
   - If no metrics: confirm docker port mappings, enable SDK debug logging, and verify the sample emits metrics (use test emitters if needed).

Why: User requested the runbook be saved and enforced so future runs follow this configuration.

-- end directive --

Title: Prefer explicit Aspire OTLP port mappings and clarify metrics export

Decision: For local Aspire Dashboard usage, update otel-bot docs and quick-start to explicitly map host ports to the container's internal OTLP ports and, when necessary, prefer explicit OTLP metric exporter configuration for reproducible metrics during local development.

Rationale:
- The Aspire Dashboard image listens on internal ports 18889 (gRPC) and 18890 (HTTP) for OTLP, while many docs and samples reference host ports 4317/4318. This requires explicit docker port mappings (e.g., `-p 4317:18889 -p 4318:18890`) to expose OTLP on the conventional host ports.
- Microsoft OpenTelemetry distro auto-detects OTLP endpoints from env vars, but custom meters may require explicit metric readers or per-signal env vars (e.g., `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`). Tests showed direct OTLP metric exporters reliably send metrics to Aspire when configured programmatically.

Action items:
- Update `node/samples/otel-bot/README.md` and `node/samples/otel-bot/index.ts` comments to use the explicit docker run mapping: `docker run -p 4317:18889 -p 4318:18890 -p 18888:18888 mcr.microsoft.com/dotnet/aspire-dashboard:latest`.
- Add a note recommending `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` when metrics do not appear using the base `OTEL_EXPORTER_OTLP_ENDPOINT`.
- Optionally, add a small test script (`emit-metric-direct.ts`) to the sample (already added) and reference it in the README as a connectivity check.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>

