# 05. Verify End-to-End Incident Diagnosis

**Release:** Operational readiness. **Prerequisites:** reliable logging, operational metrics,
distributed tracing, and configured dashboards/alerts.

## Work to do

1. Define bounded failure scenarios and expected evidence for API, publication, and worker incidents.
2. Exercise them in a controlled AWS environment and resolve missing or misleading diagnostics.
3. Publish investigation, recovery, telemetry deployment, and rollback instructions beside their owners.
4. Confirm remaining delivery/sampling limitations and complete the epic's deployed verification.

## User Story

As an operator, I want tested investigation procedures so I can diagnose and recover from incidents
using the deployed observability tools.

## Acceptance Criteria

### Investigation scenarios

- Starting with a reported request ID, an operator can find the request, its status/duration, relevant
  gateway/invocation context, and its trace when sampled. Instructions provide a log-based path when
  no trace was sampled or execution terminated before export.
- Authentication rejection, database/Redis timeout, storage failure, gateway integration failure,
  and queue publication failure can be distinguished without exposing private input or provider secrets.
- A successful save followed by failed publication or processing remains diagnosable. Operators can
  distinguish unpublished outbox backlog, queued work, transient retries, exhausted processing, DLQ
  delivery, and failed bookkeeping/cleanup, without mistaking invocation success for business success.
- Concurrent requests, duplicate deliveries, delayed publication, and repeated warm invocations keep
  correct correlation. Original processing failures survive subsequent cleanup failures.
- Deployed metrics, log queries, traces, alarms, and notifications agree for the exercised scenarios.
  Validate telemetry export/observer failures as well as application failures.

### Operational handoff

- Fault injection is bounded and uses isolated test data in a controlled environment. Define cleanup
  and stop conditions before execution; do not mutate real user data to demonstrate an alarm.
- Verify secrets, OAuth/session data, sensitive URL values, and personal content remain absent from
  all three signals. Recheck cardinality, retention, sampling, and export budgets under representative load.
- Runbooks describe entry queries, dashboards, trace navigation, failure classification, ownership,
  escalation, and safe recovery commands/capabilities. Clearly identify recovery capabilities that
  remain unavailable; observability verification does not implement unrelated recovery or cleanup.
- Document deployment and rollback for both Lambda containers and their infrastructure. Rolling back
  observability must preserve business data and existing logs and must not disable required security checks.
- Record scenario results during implementation in durable operational documentation or verification
  evidence. Close this story only after deployed checks pass; source tests alone do not establish delivery.

## Verification Notes

- Keep automated application regressions deterministic and colocated with their owners. Use mocked
  external boundaries for application tests; follow the repository prohibition on database test suites.
- Run affected backend gates sequentially, validate Terraform, and perform the agreed AWS scenarios.
  Record expected/actual signal behavior, notification delivery, recovery state, and remaining limitations.
- Store lasting instructions in `apps/api`, `apps/workers`, and `infra` documentation. Delete finished
  stories and index rows according to the backlog lifecycle; do not keep a completion log here.
