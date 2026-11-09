# Recover Unpublished Image Events

**Priority:** MVP operational completion. **Dependencies:** existing transactional outbox and image worker.

## Outcome

Image events committed during a queue outage or interrupted publication can be published again, so
memory photos do not remain pending indefinitely.

## Acceptance criteria

- Provide an authenticated operational or scheduled recovery path for unpublished events.
- Preserve safe concurrency and retry semantics; duplicate deliveries must remain safe for the worker.
- Make failures and recovery observable, and document invocation and rollback.
- Test queue outages, interrupted publication, retries, and repeated event delivery.

References: [API recovery limitation](../../../../apps/api/README.md) and
[transactional outbox specification](../../../../openspec/specs/transactional-outbox/spec.md).
