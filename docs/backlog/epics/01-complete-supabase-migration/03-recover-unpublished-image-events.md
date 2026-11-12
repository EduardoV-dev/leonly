# 03. Recover Unpublished Image Events

**Release:** MVP. **Prerequisites:** existing transactional outbox and image worker.
Independent of storage cleanup.

## Work to do

1. Choose an authenticated operator-triggered or scheduled path to republish committed events.
2. Implement recovery using the existing outbox and duplicate-safe worker contracts.
3. Verify outage recovery and concurrent retries; document invocation, failures, and rollback.

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
