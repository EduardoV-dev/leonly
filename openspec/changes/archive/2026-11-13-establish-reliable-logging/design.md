# Design

## Context

See [proposal.md](proposal.md) for motivation and [the capability delta](specs/operational-logging/spec.md)
for the behavior contract. The API uses NestJS with `nestjs-pino`; the worker logs through a shared
Pino singleton. Error serialization already redacts credentials and serializes causes. Several API
catches retain only event codes, Better Auth prints unstructured console output, health probes
discard their causes, and translated image errors lose theirs.

## Goals / Non-Goals

**Goals:**

- Identity fields on every record through the existing logger configuration.
- Safe, bounded serialization as the single privacy boundary.
- Explicit event fields at the layer that owns the outcome.
- Preserved worker error causes without changing business semantics.

**Non-Goals:**

- A request-completion boundary, `X-Request-ID` header, or platform-identity correlation.
- Security-event classification or suppression budgets.
- New Nest modules, DI seams, or logger singletons.
- `LOG_LEVEL`/`RELEASE` configuration knobs or startup validation.
- Log retention, Gateway access logs, exporters, metrics, tracing, dashboards, or alarms.
- Blanket logging of service entry/exit or catch-and-log blocks at every layer.

## Decisions

### 1. Identity through the existing logger options

Extend `createLoggerOptions` with a static `base` of `{ service, environment }`; the API logger
module and the worker singleton already construct their options through it. `environment` comes
from the `ENVIRONMENT` environment variable and falls back to `NODE_ENV` (`production`, `test`,
`development`) and finally `local`, so local runs need no configuration and deployments can set a
distinct label. Level defaults stay `debug` in development and `info` otherwise.

**Alternative:** fail startup on missing identity or add `LOG_LEVEL`/`RELEASE` knobs. Rejected
because it adds deployment requirements and configuration surface beyond the logging change.

### 2. The shared sanitizer stays the privacy and size boundary

Keep the existing redaction patterns, recursive cause handling, hostile-getter safety, and cycle
handling, and add finite bounds: 2 KiB per string, 8 KiB of stack frames, four cause links, six
object levels, 20 array entries, 30 object properties, and 12 KiB of serialized error data.
Truncation is marked and never throws. Error properties beyond approved codes, numbers, and
booleans are omitted: arbitrary third-party messages and arguments can contain personal content no
regex recognizes.

**Alternative:** serialize arbitrary objects then apply a few redaction patterns, or bound records
with a custom log destination. Rejected because secrets and personal content are not reliably
recognizable, and a stream wrapper adds moving parts for marginal benefit.

### 3. Owning boundaries log their own failures through the existing logger pattern

Services use Nest's `Logger` routed through `nestjs-pino` (the established `OutboxPublisher`
pattern). Failed health probes record `dependency_probe_failed` with dependency, duration, timeout
classification, and sanitized cause. Publication, recovery lookup, and upload-claim cleanup
catches add `event`, `outcome`, safe identifiers, and `err`. Better Auth's logger option maps its
levels and messages to approved classifications with sanitized scalar detail; the handler is
created from the `AuthService` logger and raw arguments are never forwarded.

**Alternative:** a new injectable security/event service or logging module. Rejected because the
existing logger pattern already reaches every service without new abstractions.

### 4. Worker records carry explicit fields; the earliest failure stays primary

The batch handler logs one outcome record per queue record with `messageId`, validated
`eventId`/`fileId`, `receiveCount` when present, `durationMs`, `outcome`, `code`, and sanitized
`err`. Translated image, size, and decoder errors preserve their original cause. Bookkeeping and
lease-release catches log separate secondary events with their own `err`; a `finally` release may
still throw, so processor behavior, partial-batch results, retry counts, and lease fencing are
unchanged.

**Alternative:** an async-context facility or a processor result type carrying cleanup failures.
Rejected because explicit fields at the two logging points cover the diagnostics without changing
call signatures or retry behavior.

## Risks / Trade-offs

- Allowlisting omits some human-readable third-party detail; codes, types, stacks, and nested
  causes remain, and approved classifications can be added when investigation needs them.
- Directly mounted authentication handlers run before the Pino HTTP middleware, so authentication
  requests do not produce automatic request records; provider diagnostics cover them.
- The environment label falls back to `NODE_ENV`; deployments wanting a distinct name set
  `ENVIRONMENT` explicitly.
- Abrupt Lambda termination can lose final records; this is documented in the runbook rather than
  solved with an exporter.

## Migration Plan

1. Extend the shared logger options and sanitizer; update the logger tests.
2. Add owning-boundary event fields in API services and the worker batch handler; update the
   affected tests.
3. Route Better Auth diagnostics through the service logger; document fields and queries in the
   runbook.
4. Run the backend CI gates sequentially and archive the change through the normal OpenSpec
   workflow.

Rollback: revert the owning slice. Sanitizer changes revert with the shared package; service
logging changes revert file by file.
