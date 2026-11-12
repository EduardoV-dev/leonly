# 03. Trace Requests Through Publication and Processing

**Release:** Operational readiness. **Prerequisites:** isolated logging context and the telemetry
bootstrap/export lifecycle introduced for operational metrics.

## Work to do

1. Initialize tracing before instrumented dependencies in both local and Lambda entry points.
2. Instrument API/dependency operations, publication, and worker processing stages.
3. Propagate trace context through SQS and define linkage for delayed publication and retries.
4. Correlate logs with spans and verify traces through AWS ingestion in `us-east-1`.

## User Story

As an operator, I want to follow an operation across service and queue boundaries so I can locate
the stage responsible for a failure or delay.

## Acceptance Criteria

- OpenTelemetry tracing covers API requests, including authentication handlers, and important database,
  Redis, storage, and queue operations. Instrumentation loads before dependencies and avoids duplicate spans.
- Worker spans distinguish event handling, database/storage operations, original-image preparation,
  and variant processing. Failed record outcomes mark the appropriate spans even when the Lambda
  returns a successful invocation with partial batch failures.
- SQS publication injects standard propagation context into message attributes and workers extract
  it per record. Missing or malformed context does not reject otherwise valid domain messages.
- Define and implement useful causality for outbox records published after the original request ends,
  including scheduled recovery when available. Persist only required safe context when necessary;
  use parent context or span links with documented retry semantics rather than implying continuous
  execution. Durable event IDs remain available across publication attempts and duplicate deliveries.
- Logs emitted within active spans include trace and span IDs. Context remains isolated between
  requests, records, concurrent executions, and warm invocations.
- Sampling and safe-attribute policies are configurable and documented. Captured URLs, dependency
  attributes, SQL, errors, and baggage must not expose credentials, query parameters, bind values,
  session data, or personal content. Do not trust inbound baggage as actor identity.
- AWS deployment exports through the X-Ray ingestion backend for CloudWatch investigation. Keep
  provider-specific authentication, endpoints, and permissions outside business instrumentation.
  Confirm compatibility with the actual Node.js runtime and Lambda container packaging.
- Trace export has bounded invocation-completion flushing and failure diagnostics. Exporter outages
  do not change application results, commits, or acknowledgments; document sampling/termination limits.

## Decisions Required

- Choose sampling rates and propagation formats compatible with both standard context and AWS.
- Choose delayed-outbox context persistence/linkage and retry span semantics before schema or contract edits.
- Confirm container bootstrap and exporter/collector packaging for the deployed runtime.

## Verification Notes

- Follow a successful API operation into publication and worker stages. Repeat with a dependency
  failure, retried delivery, mixed-success batch, and delayed outbox publication.
- Test missing/invalid propagation headers, concurrent contexts, warm reuse, safe attributes, and
  exporter failure. Preserve event validation and partial batch contracts.
- Verify log-to-trace navigation and trace delivery in AWS. Run affected application, shared-package,
  and infrastructure checks; document the tracing behavior in the owning operational guides.
