# 06. API and Worker Observability

Make failures detectable and diagnosable across API requests, transactional outbox publication,
SQS delivery, and worker execution. Release: operational readiness. Prioritize API diagnostics,
then apply the same operational guarantees to workers.

## Work order

| Order | User story | Finish when |
| --- | --- | --- |
| 01 | [Establish reliable logging](01-establish-reliable-logging.md) | API and worker failures produce safe, structured, correlated logs in CloudWatch. |
| 02 | [Add operational metrics](02-add-operational-metrics.md) | Request health, publication, worker outcomes, and stalled outbox work are measurable. |
| 03 | [Add distributed tracing](03-add-distributed-tracing.md) | Operators can follow operations across API, publication, SQS, and worker boundaries. |
| 04 | [Configure dashboards and alerts](04-configure-dashboards-and-alerts.md) | Degradation and stalled work produce actionable, verified notifications. |
| 05 | [Verify incident diagnosis](05-verify-incident-diagnosis.md) | Deployed failure scenarios can be investigated using tested operational instructions. |

## Deployment and boundaries

- The API and workers run as AWS Lambda container images in `us-east-1`.
- CloudWatch is the initial operational destination. Keep Pino JSON logs on stdout and use
  OpenTelemetry for provider-neutral application metrics and traces. Keep AWS export details in
  deployment configuration; changing providers must not require rewriting business operations.
- AWS trace ingestion uses the X-Ray backend, with CloudWatch as the operational interface.
  Verify regional/runtime support, permissions, container packaging, and Lambda-aware export during
  implementation rather than assuming a managed layer can be attached to a container image.
- Reuse the shared logger and existing application configuration boundaries. Keep feature-specific
  events and operations in their owning application; shared packages must not import application code.
- Event recovery remains owned by the existing transactional-outbox recovery capability. This epic
  observes unpublished work and instruments recovery when available; it does not duplicate recovery.

## Prerequisites and decisions

The current API, image worker, outbox, and queue are the initial scope. Apply the same conventions to
additional workers present when implementation begins. Storage cleanup, places, and dashboard
feature expansion do not block this work.

The configurable initial log-retention default is approved at 30 days. Choose alarm
owners, notification routing, thresholds, sampling, and telemetry budgets in the owning stories.
Production API deployment ownership must be identified before changing its infrastructure: the
repository API module is currently referenced by the local environment.

OpenSpec contracts remain normative. Document any new durable telemetry contracts through the
project's specification workflow. Keep runbooks in application/infrastructure documentation. Delete
each story and its index row after implementation and required verification pass; remove the epic
when no work remains.
