# Optimistic Locking For Resource Updates

Apply this contract when a stale user edit must not overwrite another change; not every update needs
optimistic locking. Preserve existing API preconditions unless a compatible change is planned. Prefer
a suitable integer version as the token, reusing an existing version column where appropriate; otherwise
use a reliably advancing `updated_at`. Require the resource's last-read token in update bodies, including
partial updates: use the established version field contract or `lastKnownUpdatedAt` for timestamps.
Never use the client's current local time. Validate tokens
before mutation, preserving version range and precision end to end. Keep creates outside this precondition.

## Perform One Conditional Write

Keep the selected token comparison inside the database update alongside resource identity, ownership/tenant
scope, and applicable domain predicates. Bind all values; never interpolate request values into SQL.
An earlier read may establish authorization or domain rules, but cannot replace the atomic comparison.

```sql
-- Schematic bound-parameter SQL; adapt binding and result retrieval to the installed database.
UPDATE resources
SET name = :name,
    updated_at = :nextUpdatedAt
WHERE id = :id
  AND tenant_id = :authorizedTenantId
  AND updated_at = :lastKnownUpdatedAt;
```

This illustrates the timestamp fallback. For a version column, match `version = :lastKnownVersion`
and atomically advance the version instead; return the persisted version. Ensure the version cannot wrap
or be reused, and represent large integers without JavaScript precision loss.

Here `authorizedTenantId` comes from verified authorization, and `nextUpdatedAt` is server-owned and
strictly later than the matched timestamp at the column's precision. Whitelist writable fields;
`lastKnownUpdatedAt` is comparison metadata, never an entity field or the value assigned to `updated_at`.
Never spread the whole request body into a persistence update.

| Database outcome | Required behavior |
| --- | --- |
| Exactly one row updated | Continue normally; return the persisted resource's new token. |
| Zero rows updated | Return HTTP 409 using the ordinary failure envelope and a safe refresh instruction. |
| Unexpected database error or multiple rows updated for one resource | Treat as an internal failure; never mislabel it as a stale-token conflict. |

Use the database's affected-row count or returned-row result, not a separate existence check, as proof
of success. Never retry a failed write without its token predicate, silently fetch a new token to
overwrite newer changes, or emit success side effects after a failed match. Keep related database writes
in the same transaction so a conflict rolls back the entire operation. Do not add an explicit transaction
solely for one optimistic write or combine optimistic and pessimistic locking for the same operation.
If a single-write operation requires a transaction for a separate invariant, surface that requirement.

Zero matches alone do not prove another update occurred: the resource may be deleted, inaccessible, or
fail another predicate. Preserve established authorization and not-found handling, including non-disclosure
policy. For an authorized update that fails the token precondition, use a conflict message such as
"This resource was updated elsewhere. Refresh it and try again." Clients must refresh and reconcile
their edits before resubmitting, rather than automatically replaying the stale patch.
Update the client cache with the persisted new token before submitting subsequent edits. Do not share a
token across unrelated operations unless they genuinely belong to the same concurrency boundary.

## Preserve An Exact, Changing Token

- For a timestamp token, validate a timezone-qualified ISO-8601 string at the stored precision; reject
  impossible dates. Preserve existing higher-precision contracts until a safe migration is complete.
- Preserve database precision in reads, response serialization, client storage, request validation,
  database binding, and comparison. Do not pass microsecond tokens through JavaScript `Date`, truncate
  them to milliseconds, or compare formatted timestamp text instead of database timestamp values.
- Advance `updated_at` atomically for every accepted update, including no-op patches. Do not assume
  clock resolution or transaction-stable `now()` guarantees a different value. Use a database-compatible
  mechanism that produces a strictly later value at stored precision; verify driver/ORM behavior.
- Ensure every writer affecting the protected concurrency boundary advances the same timestamp,
  including background jobs and administrative paths. If the schema or driver cannot preserve and advance the token, surface the
  limitation before claiming optimistic-lock protection; do not silently weaken the comparison.
- For JavaScript applications using PostgreSQL, use `timestamptz(3)` for application-owned system
  timestamps and follow the [PostgreSQL trigger pattern](../../ev-postgres/references/locking.md).

## Verification Scenarios

Verify behavior through the real persistence boundary, not only mocked query calls:

1. A matching version or timestamp updates one authorized resource and returns its precisely serialized new token.
2. A stale token returns 409, leaves persisted fields unchanged, and produces no success side effects.
3. Two concurrent updates using the same token yield exactly one success and one conflict. Also check
   rapid successive/no-op updates: the selected token advances and the previous token cannot be reused.
4. Missing/null tokens, non-strings, impossible dates, absent timezones, and excess fractional digits
   fail validation as applicable. Valid timestamp offsets and the stored precision survive a full round trip;
   version tokens retain their exact integer value.
5. Missing/deleted resources and unauthorized or cross-tenant attempts retain the existing safe policy;
   database failures remain internal errors and transactional related writes roll back on conflict.
