---
name: ev-postgres
description: "Trigger: PostgreSQL schema, timestamps, transactions, or locking. Apply precision and concurrency rules with safe database updates."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV PostgreSQL

## Activation Contract

Use when implementing or reviewing PostgreSQL schemas, timestamp handling, transactions, or locking.
Apply the general and backend rules alongside this skill.

## Hard Rules

- For JavaScript applications, use `timestamptz(3)` for application-owned system timestamp columns
  across tables. Preserve existing higher-precision values and consumers until a safe migration is planned;
  do not alter PostgreSQL system catalogs. Preserve precision needed by external contracts.
- Prefer an existing version column for optimistic locking; otherwise use `updated_at`. Compare and
  advance the token atomically, including on no-op updates. All writers must participate.
- For timestamp tokens, use the [trigger pattern](references/locking.md) or another proven mechanism
  that advances strictly at stored precision. A trigger does not replace the conditional write.
- Use a transaction for two or more mutations in one atomic operation. For pessimistic locking, acquire
  and hold the lock in the transaction performing the protected work. Do not combine optimistic and
  pessimistic locking for the same operation; do not add a transaction solely for one optimistic write.
- Respect isolation level, constraints, authorization, existing contracts, and retry requirements;
  surface cases where this locking policy cannot protect the required invariant.

## Execution Steps

1. Inspect schema precision, existing tokens, writers, transactions, and consumers before changing them.
2. Apply the [locking and trigger guidance](references/locking.md); preserve data during migrations.
3. Verify concurrent writes, rapid updates, rollback, and the selected token's database/client round trip.

## Output Contract

Report material migration and verification gaps. For explicit reviews, follow the review coordinator.

## References

- [PostgreSQL locking and timestamp trigger](references/locking.md)
