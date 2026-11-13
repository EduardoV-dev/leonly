# 01. Establish Reliable API and Worker Logging

**Release:** Operational readiness. **Prerequisites:** existing API, image worker, and shared Pino logger.

**Implementation plan:** [establish-reliable-logging](../../../../openspec/changes/establish-reliable-logging/proposal.md).

## Work to do

1. Fix API logging coverage first: authentication routes, Better Auth diagnostics, failed health
   probes, selected security events, and publication/recovery/cleanup errors.
2. Add shared diagnostic fields and isolated request/invocation context to the API and workers.
3. Preserve original worker failures through error translation, bookkeeping, and lease release.
4. Manage CloudWatch log groups, retention, and API Gateway access logs through infrastructure.
5. Verify application behavior and deployed log delivery; document fields and investigation queries.

## User Story

As an operator, I want consistent, safe, correlated application logs so I can diagnose failed
requests and background jobs without reproducing them.

## Acceptance Criteria

### API logging

- Request logging runs before directly mounted authentication handlers without breaking Better Auth
  request-body handling. Successful and failed authentication requests receive completion records.
- Completion records include method, safe path, status, duration, and a server-generated request ID.
  Return `X-Request-ID` on application responses and expose it through CORS. Associate available
  API Gateway request IDs and Lambda invocation IDs without trusting caller headers as platform identity.
- Better Auth diagnostics use the shared structured logger and sanitizer. Failed dependency probes
  record dependency, duration, timeout classification, and sanitized cause; successful probes stay quiet.
- Stable security events distinguish selected authentication, authorization, CSRF, validation, and
  rate-limit failures. Include verified opaque actor IDs and policy names where available, without
  elevating every expected client failure to an error or producing uncontrolled repetitive logs.
- Request severity follows an explicit outcome policy: server failures are errors; selected security
  and retryable conditions are warnings; ordinary completion is informational.
- The request boundary owns exactly one completion record and retains the sanitized original error
  for unexpected failures, including exceptions from services without local catch blocks. Remove
  the logger injection and generic error call from `api-exception.filter.ts` only after this fallback
  is covered; preserve its response-normalization behavior.
- Services explicitly log meaningful publication, recovery, dependency, bookkeeping, and cleanup
  events with stable event names, outcomes, and safe identifiers. Do not log every service call or
  repeat the same exception at each rethrowing layer. Security boundaries own security-event details.

### Shared and worker diagnostics

- Logs identify service, deployment environment, and release. A validated log-level setting uses
  each application's established configuration boundary; production remains JSON and development
  remains readable. Extend the existing logger rather than introducing a forwarding-only abstraction.
- Worker record logs include Lambda invocation ID, message/event/file IDs where available, receive
  count, duration, and outcome. Partial batch failures and retry exhaustion remain distinguishable.
- Catch paths retain sanitized original errors under `err`; translated errors preserve their cause.
  Processing, publication, recovery, bookkeeping, and cleanup failures retain relevant safe identifiers.
- A cleanup failure cannot replace an earlier processing failure. Report both separately. If processing
  succeeds but lease release fails, include the record in the partial batch failure response for retry;
  retain existing idempotency and retry-exhaustion behavior.
- Context cannot leak between concurrent requests, records, or warm invocations. Exclude credentials,
  cookies, OAuth codes, session objects, sensitive query values, personal content, and request bodies.

### AWS logging

- API, worker, and API Gateway access-log groups have explicit configurable retention with an approved
  initial default of 30 days. Inspect existing groups and import them where needed before applying
  Terraform; do not recreate groups or discard existing logs during adoption. Retention intentionally
  expires entries older than the configured period.
- API Gateway emits JSON access logs with request ID, route, status, latency, and safe integration
  failure diagnostics, including failures that never reach the application.
- Preserve Lambda stdout delivery without adding a duplicate application log-export path. Bound
  diagnostic size and volume, and document any limits on final log delivery during abrupt termination.

## Confirmed Decisions

- The initial configurable log-retention default is approved at 30 days.
- HTTP outcomes belong to the request boundary; operational events belong to their owning services;
  selected security events belong to security boundaries. Remove the exception-filter logger after
  proving equivalent unexpected-error coverage at the request boundary.
- AWS infrastructure changes belong under root `infra/`. The API module exists in `infra/modules/api`;
  confirm deployed resource ownership and Terraform state before applying changes because its only
  checked-in environment reference currently targets `floci-local`.

## Implementation Decisions to Specify

- The [OpenSpec design](../../../../openspec/changes/establish-reliable-logging/design.md) specifies
  the severity matrix, safe diagnostic fields, and initial per-instance security-detail limits:
  10 per event/approved-route/policy per minute, 64 counters, and 128 details globally per minute.
  Completion records and unexpected-error evidence are not sampled by these limits.
- Inspect AWS resources and Terraform state to resolve deployed API ownership, imports, and the
  environment wiring needed for gateway and log-group changes.

## Verification Notes

- Test authentication coverage and body handling, request headers/CORS, severity, failed health probes,
  nested error causes, hostile callback URLs, and redaction of secrets and personal data.
- Verify exactly one completion record and preserved error diagnostics for an unexpected service
  exception without a local catch; verify distinct operational failures without duplicate rethrow logs.
- Test concurrent requests and repeated warm invocations with distinct identifiers. Exercise worker
  retries and simultaneous processing/bookkeeping/lease-release failures without changing batch semantics.
- Run the affected application/shared-package checks and infrastructure validation. Inspect deployed
  logs for both an API failure and a worker failure, plus a gateway failure outside the application.

Starting points: `apps/api/src/common/logger`, `apps/api/src/auth`, `apps/api/src/common/outbox`,
`apps/api/src/health`, `apps/workers/src/functions/image-processing`, `packages/utils/src/logger`,
`infra/modules/api`, and `infra/environments/staging`.
