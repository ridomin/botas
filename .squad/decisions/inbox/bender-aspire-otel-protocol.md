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
