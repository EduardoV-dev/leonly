# Operations Logging Runbook

Application logs are structured JSON records produced by Pino and delivered through Lambda stdout
to CloudWatch Logs. Development output stays human-readable through `pino-pretty`. This document
defines the record identity, the events each owner emits, the sanitization guarantees, and the
investigation queries.

## Record identity fields

| Field | Meaning |
| --- | --- |
| `service` | `api` or `image-worker` |
| `environment` | Deployment label (`staging`, `production`, `test`, `local`) |
| `level`, `time`, `msg` | Standard Pino record fields |

The label comes from the `ENVIRONMENT` environment variable and falls back to `NODE_ENV`, so
local runs report `local`/`development`/`test` without configuration. Deployed environments set
`ENVIRONMENT` explicitly; the deployed staging worker sets `ENVIRONMENT=staging`, and the deployed
API Lambda configuration should do the same. Handled API routes carry the generated `req.id`; directly mounted authentication requests run before
the request logger, so `auth_request_failed` records carry `method` and `path` instead. Worker records
bind the Lambda `awsRequestId` per invocation and include message/event identifiers.

## Request logging

The API uses `nestjs-pino` (Pino HTTP) with the shared configuration. Each handled Nest route gets
one automatic request record containing `req` (`id`, `method`, `path`) and `res` (`statusCode`);
request IDs are generated UUIDs, queries are stripped from `path`, and successful `/api/health`
requests are ignored. Directly mounted authentication handlers run before that middleware, so
authentication requests do not produce automatic request records (pre-existing behavior).

## API operational events

Owning services and boundaries record failures with stable event names:

| Event | Emitted by | Fields |
| --- | --- | --- |
| `dependency_probe_failed` | Health service | `dependency`, `durationMs`, `timedOut`, `outcome` (`timeout` / `rejected` / `unhealthy`), `err` |
| `outbox_publication_failed` | Outbox publisher | `eventId`, `entityId`, `code`, `outcome` (`failed` / `uncertain`), `err` |
| `outbox_bookkeeping_failed` | Outbox publisher | `eventId`, `entityId`, `code`, `outcome: "failed"`, `err` |
| `memory_publication_failed` | Memories service | `memoryId`, `eventIds`, `outcome: "uncertain"`, `err` |
| `memory_edit_publication_failed` | Memory edit service | `memoryId`, `eventIds`, `outcome: "uncertain"`, `err` |
| `memory_creation_recovery_lookup_failed` | Memories service | `outcome: "failed"`, `err` |
| `upload_claim_release_failed` | Memories services | `uploadIds`, `outcome: "failed"`, `err` |
| `auth_provider_diagnostic` | Better Auth logger hook | `level`, `classification`, `detail` or sanitized `err` |
| `auth_request_failed` | Direct auth handler | `method`, `path`, `status`, `err` |
| `api_request_failed` | Exception filter | `status`, `msg: "Unhandled API error"`, `err` |

A committed business result is never changed by logging; publication failures keep the existing
uncertain-publication semantics. Successful dependency probes emit nothing.

`auth_provider_diagnostic` classifications: `oauth_state_invalid`, `provider_callback_failed`,
`provider_account_rejected`, `provider_request_rejected`, and `provider_diagnostic` for anything
unclassified. Raw Better Auth arguments (sessions, callback payloads, provider structures) are
never forwarded; only sanitized scalar arguments are retained.

## Worker events

The image worker emits one outcome record per queue record:

- `image_processed` (info): `messageId`, `eventId`, `fileId`, `receiveCount` (when present),
  `durationMs`, `outcome` (`completed`, `already_completed`, `unavailable`).
- `image_processing_failed` (error): the same identifiers plus `code`, `outcome`
  (`retryable_failure` or `retries_exhausted`), `durationMs`, and sanitized `err`.

Secondary failures are reported separately with their own sanitized `err` and never replace the
original processing failure: `image_failure_bookkeeping_failed`, `image_failure_release_failed`,
and `image_exhausted_failure_bookkeeping_failed`. An unexpected batch-level failure emits
`image_batch_failed` (error) with `recordCount`, the invocation `awsRequestId`, and sanitized `err`,
then remains a Lambda failure for retry.

## Sanitization and size bounds

The shared error serializer keeps records safe and bounded:

- Redactions: authorization/cookie/api-key headers, set-cookie, password/token/secret fields,
  bearer and basic tokens, URL credentials, query strings, URL fragments, JWTs, and emails.
- Error properties beyond approved codes (short alphanumeric codes), numbers, and booleans are
  omitted; third-party message text is never trusted after regex redaction alone.
- Hostile getters are never invoked; cycles become `[Circular]`; invalid dates are dropped.
- Finite bounds: 2 KiB per string, 8 KiB of stack frames, four cause links, six object levels, 20
  array entries, 30 object properties, and 12 KiB of serialized error data. Truncation is marked
  with `[Truncated]` or a `truncated` flag and never throws.

## Log levels

The minimum severity is `debug` in development and `info` otherwise. Production records are
structured JSON; development output is pretty-printed.

## Investigation queries (CloudWatch Logs Insights)

API operational failures:

```sql
fields @timestamp, event, status, method, path, eventId, entityId, code, outcome,
  err.message, durationMs
| filter event in ["dependency_probe_failed", "outbox_publication_failed",
  "outbox_bookkeeping_failed", "memory_publication_failed",
  "memory_edit_publication_failed", "memory_creation_recovery_lookup_failed",
  "upload_claim_release_failed", "auth_request_failed", "api_request_failed"]
| sort @timestamp desc
```

Authentication provider diagnostics:

```sql
fields @timestamp, level, classification, detail
| filter event = "auth_provider_diagnostic"
| sort @timestamp desc
```

Worker outcomes and secondary failures:

```sql
fields @timestamp, awsRequestId, event, messageId, eventId, fileId, receiveCount,
  durationMs, outcome, code, err.message
| filter event in ["image_processed", "image_processing_failed",
  "image_failure_bookkeeping_failed", "image_failure_release_failed",
  "image_exhausted_failure_bookkeeping_failed", "image_batch_failed"]
| sort @timestamp desc
```

## Delivery

Application logs are delivered through Lambda stdout into each function's default CloudWatch log
group (`/aws/lambda/<function-name>`). Abrupt termination (timeout, crash, or forced shutdown) can
lose final records; platform timeout and runtime evidence remain available in CloudWatch.
