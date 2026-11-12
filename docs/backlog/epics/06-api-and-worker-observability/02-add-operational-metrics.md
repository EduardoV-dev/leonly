# 02. Measure Application Health and Background Progress

**Release:** Operational readiness. **Prerequisites:** service/environment identity and configuration
boundaries established by reliable API and worker logging.

## Work to do

1. Establish a shared OpenTelemetry initialization/configuration convention with application-owned
   lifecycle wiring and AWS-specific export configuration at deployment boundaries.
2. Measure API requests and important dependency operations, publication outcomes, and worker records.
3. Add a bounded periodic observation of unpublished outbox count and oldest-event age.
4. Verify metrics in CloudWatch and document names, units, dimensions, and collection behavior.

## User Story

As an operator, I want metrics for request health and background progress so I can detect degradation
even when requests or Lambda invocations return successfully.

## Acceptance Criteria

- OpenTelemetry instruments expose API request counts, status classes, latency distributions, and
  important dependency failures/durations. Use bounded route templates rather than raw identifier paths.
  Authentication and directly mounted handlers receive equivalent coverage without double counting.
- Publication metrics distinguish published, failed, uncertain, and deferred outcomes and measure
  publication duration. API success must not imply successful asynchronous processing.
- Worker metrics distinguish completed, already-completed, unavailable, and failed records, with
  processing duration, retries, and exhaustion. Returning partial batch failures still records failures.
- Unpublished event count and oldest-event age are observed on a bounded periodic path independent of
  API traffic. An empty backlog has a defined healthy value; observer failures are distinguishable
  from an empty backlog. Monitoring does not publish events or mutate their processing state.
- Metric attributes are bounded and documented. Request, user, tenant, file, message, and event IDs,
  raw URLs, query text, and personal content are not metric dimensions. Histogram units/boundaries
  and aggregation semantics support the later dashboard and alarm requirements.
- CloudWatch export works in `us-east-1` using deployment-owned credentials and least-privilege
  permissions. Application instruments do not depend on AWS-specific metric APIs.
- Export handles short Lambda invocations and warm reuse with bounded time/memory/network budgets.
  Exporter failure does not change request results, database commits, or queue acknowledgments, and
  produces bounded diagnostics so loss of telemetry can be detected.

## Decisions Required

- Select metric names, units, histogram boundaries, collection/export intervals, and cost/cardinality budgets.
- Select the Lambda-compatible exporter/collector deployment and periodic outbox observation owner.
  Reuse an existing scheduled recovery execution only if it meets independent monitoring requirements.

## Verification Notes

- Test metric outcomes for API errors, dependency timeouts, failed/uncertain/deferred publication,
  partial batch failure, repeated delivery, and exhausted retries.
- Leave an event unpublished without further API traffic and verify its age increases in CloudWatch.
  Test empty backlog and observer failure without requiring database integration test suites.
- Verify invocation-completion export, concurrent invocations, exporter outage behavior, dimension
  bounds, IAM, and deployed CloudWatch delivery. Run affected application and infrastructure checks.

Event republication remains owned by the transactional-outbox recovery capability in the storage
and image operations epic. This story adds observation, not a second recovery implementation.
