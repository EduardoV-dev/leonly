# 04. Build Actionable CloudWatch Dashboards and Alerts

**Release:** Operational readiness. **Prerequisites:** operational metrics and CloudWatch log delivery.
Trace drill-down requires distributed tracing; the initial alert definitions can be developed before it.

## Work to do

1. Define dashboards, alarms, and notification routing in Terraform for the deployed applications.
2. Combine application metrics with native Lambda, HTTP API Gateway, and SQS metrics.
3. Add saved log queries, investigation links, and alarm-specific response instructions.
4. Verify notification delivery, missing-data behavior, and recovery in a controlled environment.

## User Story

As an operator, I want an actionable health dashboard and failure notifications so I know when
intervention is needed and where to investigate.

## Acceptance Criteria

- Dashboards show API traffic, errors, latency, and dependency health; publication outcomes and
  unpublished backlog; worker processing outcomes and duration; and queue/DLQ health. Views identify
  service/environment and support investigation of a relevant release and time window.
- Alarms cover sustained API degradation, Lambda invocation errors/throttling, queue age, DLQ
  messages, worker record failures/exhaustion, and unpublished outbox age. Account for API Gateway
  integration failures and requests that never reach application instrumentation.
- Worker alerts use record-level outcomes as well as native Lambda metrics: a successful Lambda
  invocation with partial batch failures must not hide failed work.
- Every alarm has an owner, notification destination, documented threshold/window, missing-data
  behavior, and response instructions. Low-traffic error rates have appropriate volume handling;
  monitoring/export failures must not silently appear healthy.
- Dashboard and alarm investigation paths lead to useful log queries and traces where available.
  Queries use the documented structured fields and exclude sensitive content.
- Resources are environment-scoped and managed through the owning infrastructure. Notifications use
  least-privilege configuration, and test alerts are distinguishable from actual incidents.
- Controlled tests demonstrate alarm activation, notification delivery, and return to a healthy state.
  Document adjustments and expected running costs before enabling production notification routing.

## Decisions Required

- Select operational owners, notification channel/recipient, and escalation expectations.
- Approve initial thresholds, evaluation windows, missing-data policies, and dashboard/alert cost budget.
  Base latency and backlog thresholds on measurements and the application's processing expectations.

## Verification Notes

- Validate Terraform and inspect the plan before deployment. Verify resource names, metric dimensions,
  permissions, and notification subscriptions in `us-east-1`.
- Exercise API degradation, a record-level worker failure, growing backlog, DLQ delivery, and a failed
  telemetry observer. Verify notifications and actionable links, then confirm alarm recovery.
- Keep durable alarm response instructions in application/infrastructure documentation, not solely
  in this disposable backlog story.
