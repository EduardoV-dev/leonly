# PostgreSQL Locking And Timestamp Tokens

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
time during rapid writes or clock adjustments; do not use it as an exact audit time. A version column
is preferred when already present; maintain `updated_at` separately when the application needs it.

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

Verify against a real PostgreSQL instance: two updates using one token have one winner, rapid and no-op
updates strictly advance, precision survives the client round trip, failed related writes roll back,
and a pessimistic lock blocks competing work until commit or rollback. Check stronger isolation error
handling when used. Include all writers and any trigger interactions in the test scope.
