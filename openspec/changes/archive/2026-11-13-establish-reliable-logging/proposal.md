# Proposal

## Why

API publication, recovery, cleanup, and health-probe failures log without identifiers or causes;
Better Auth diagnostics print unstructured console output; and worker failure bookkeeping can hide
the original processing error. Operators cannot investigate these failures without reproducing
them.

## What Changes

- Stamp every application record with `service` and `environment` identity through the shared Pino
  logger configuration.
- Keep error serialization safe and bounded: recursive cause sanitization, redaction, hostile-getter
  safety, and finite truncation limits.
- Record failed dependency probes with dependency, duration, timeout classification, and sanitized
  cause; successful probes stay quiet.
- Route Better Auth diagnostics through the shared structured logger with approved classifications
  and sanitized detail.
- Update API publication, recovery lookup, and owning-service cleanup catches with explicit
  event/outcome/identifier/err fields.
- Worker record outcomes carry message/event/file identifiers, receive count, duration, and
  outcome; translated errors preserve their causes; bookkeeping and release failures report
  separately under sanitized `err` fields.

## Capabilities

### New Capabilities

- `operational-logging`: Safe, bounded application diagnostics with identity and owning-boundary
  event fields.

### Modified Capabilities

None. Existing API response, image-processing, and transactional-outbox contracts remain in force.
Logging observes these behaviors without changing them.

## Impact

- Shared `packages/utils/src/logger` configuration and sanitizer; API logger module, outbox
  publisher, memories services, health probes, and Better Auth options; worker logger, batch
  handler, image recipe, and failure bookkeeping.
- No new runtime dependency, Nest module, HTTP boundary, request identifier, security-event
  budget, database migration, exporter, metrics, tracing, dashboard, alarm, or infrastructure
  change is included. Existing application stdout remains the delivery path.

Source: [backlog story](../../../docs/backlog/epics/06-api-and-worker-observability/01-establish-reliable-logging.md).
