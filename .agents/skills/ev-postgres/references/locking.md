# PostgreSQL Locking And Timestamp Tokens

## Choose The Simplest Correct Mechanism

Use a standard update when last-write-wins is acceptable and the operation does not depend on a
previously read value. PostgreSQL still obtains its normal row locks. For counters and quantities, use
an in-database relative update; for inventory or state transitions, prefer a single conditional update
and check the affected row count. Validate quantities, authorization, and business predicates; zero
rows can mean a missing or inaccessible resource as well as a failed condition.

Use optimistic locking to prevent overwriting a user's stale edit. Prefer an integer version advanced
on every mutation affecting the protected boundary; use a strictly advancing timestamp only when its
precision and update behavior are reliable. Keep independent concurrency boundaries separate.

Use a transaction for dependent mutations. Add explicit pessimistic locks when conditional statements
alone cannot adequately protect a read-validate-write invariant. Lock all relevant rows in a consistent
order, keep the transaction short, configure appropriate transaction and lock timeouts, and handle
failures; retry a deadlocked transaction only when safe. Do not wait on external APIs or user input while
holding locks. Row locks do not protect absent rows or arbitrary predicate ranges: use suitable
constraints, isolation, or other coordination when the invariant requires them. For an inventory
transfer, a conditional decrement plus the remaining writes in one transaction may suffice.

### Conditional Update Examples

These PostgreSQL fragments use schematic bound parameters. Enforce authorization and validate a
positive `:quantity` before executing them; preserve existing not-found and non-disclosure policies.

```sql
-- Atomic relative update: concurrent increments are not lost.
UPDATE products SET view_count = view_count + 1 WHERE id = :id;

-- Atomic conditional update: check that exactly one row was updated.
UPDATE products SET stock = stock - :quantity
WHERE id = :id AND stock >= :quantity;

-- Only a draft invoice can transition to approved.
UPDATE invoices SET status = 'APPROVED'
WHERE id = :id AND status = 'DRAFT';
```

An ordinary preference update can set the requested value directly when last-write-wins is acceptable.
For an optimistic update, include the last-read version in the predicate, increment it in the same
statement, and return the persisted token. A timestamp predicate alone does not advance the token.
For a transfer requiring explicit locks, lock both existing stock rows in the same stable ID order in
every competing transaction before checking and changing their protected state; record the movement in
that transaction. Check for missing rows and rollback on failure. This is only sufficient when those
rows cover the invariant; absent rows or other dependencies need additional protection.

## Timestamp Precision And Tokens

For JavaScript applications, define application-owned system timestamps such as `created_at` and
`updated_at` as `timestamptz(3)`. JavaScript `Date` stores milliseconds; a higher-precision value
must not be passed through it before an exact comparison. Preserve higher precision as an exact string
when an existing schema or external contract requires it. Plan precision changes as data migrations:
assess rounding, collisions, active clients, ordering, and compatibility before changing stored values.

When `updated_at` is the optimistic token, a non-null finite `timestamptz(3)` can use this pattern:

```sql
CREATE OR REPLACE FUNCTION private.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := GREATEST(
    pg_catalog.clock_timestamp()::timestamptz(3),
    OLD.updated_at + interval '1 millisecond'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.resources
FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
```

Adapt schema, names, permissions, and migrations to the application. Require a finite initial value,
ensure every writer fires the trigger, and prevent other triggers from overwriting the result. Never
restrict it to changed columns or skip no-op updates. This logical timestamp can move ahead of wall
time during rapid writes or clock adjustments; do not use it as an exact audit time. Prefer a suitable
integer version column; maintain `updated_at` separately when the application needs it.

Use an atomic conditional `UPDATE` matching the last-read token, identity, and authorized scope; the
trigger only advances the value. In PostgreSQL `READ COMMITTED`, concurrent updates wait and recheck
the predicate against the current row. At stronger isolation levels, handle serialization failures
according to the application's retry policy without silently retrying with a refreshed token. Check
the affected row count and return the persisted token. See the
[shared API contract](../../ev-api-contracts/references/optimistic-locking.md) for conflict handling.

For multiple mutations belonging to one atomic operation, roll back all on any failure, including an
optimistic conflict. For pessimistic locking, hold `SELECT ... FOR UPDATE` or the appropriate lock in
the same transaction through the dependent work; an autocommit locking read releases its lock too soon.
Do not use explicit pessimistic locks for the same optimistic operation. PostgreSQL's implicit row
locks during `UPDATE` are normal and do not constitute a separate pessimistic locking strategy.
Transactions may still be required for a single mutation when the invariant or isolation demands it;
surface such a requirement rather than silently weakening correctness.

Verify the applicable strategy against a real PostgreSQL instance: concurrent relative/conditional
updates preserve the invariant, failed related writes roll back, and pessimistic locks block competing
work until commit or rollback. For optimistic locking, verify two updates using one token have one winner,
rapid and no-op updates strictly advance, and precision survives the client round trip. Check stronger
isolation error handling when used. Include relevant writers and trigger interactions in the test scope.
