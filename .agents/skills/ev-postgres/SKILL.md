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
- Select the simplest concurrency mechanism that preserves the invariant: standard update, atomic
  relative/conditional update, optimistic locking for stale edits, or a transaction with pessimistic
  locks when needed. Follow [the decision guidance](references/locking.md).
- For optimistic locking, prefer an integer version (reuse an existing suitable column); otherwise use
  `updated_at`. Compare and advance the token atomically, including on no-op updates. Every writer
  affecting that concurrency boundary must participate.
- For timestamp tokens, use the [trigger pattern](references/locking.md) or another proven mechanism
  that advances strictly at stored precision. A trigger does not replace the conditional write.
- Use a transaction for two or more mutations in one atomic operation. For pessimistic locking, acquire
  and hold all necessary locks in the transaction performing the protected work. Keep it short, acquire
  locks in a consistent order, configure timeouts, and retry deadlocks only when safe. Do not combine
  optimistic and pessimistic locking for the same operation; do not add a transaction solely for one optimistic write.
- Respect isolation level, constraints, authorization, existing contracts, and retry requirements;
  surface cases where this locking policy cannot protect the required invariant.

## Execution Steps

1. Inspect schema precision, existing tokens, writers, transactions, and consumers before changing them.
2. Apply the [locking and trigger guidance](references/locking.md); preserve data during migrations.
3. Verify the selected strategy's concurrent behavior and rollback; when using a token, verify rapid
   updates and its database/client round trip.

## Output Contract

Report material migration and verification gaps. For explicit standards checks, report every evidenced finding.

## References

- [PostgreSQL locking and timestamp trigger](references/locking.md)
