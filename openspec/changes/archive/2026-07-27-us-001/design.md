## Context

Leonly already has a Next.js create/join flow, Supabase tables for spaces and memberships,
security-definer RPCs, and server-side active-space routing. The current implementation splits
creation from onboarding completion, exposes distinct invite failures, does not regenerate invites
or rate-limit attempts, and relies on RPC checks rather than a database capacity constraint.

This change crosses UI, route handlers, PostgreSQL functions, constraints, RLS, and migrations.
Supabase remains the authoritative transaction and concurrency boundary; route checks exist only for
fast feedback. Google authentication is an external prerequisite.

## Goals / Non-Goals

**Goals:**

- Make create, validate, redeem, consume, and regenerate operations atomic where state changes.
- Enforce membership capacity and join throttling under concurrent requests.
- Resolve the user-story input, invite-format, and safe-error decisions consistently at every layer.
- Reuse the existing setup UI, dashboard shell, Supabase client, Zod, and routing helpers.
- Add runnable database integration checks for invariants that unit mocks cannot prove.

**Non-Goals:**

- Leaving spaces, removal, closure, ownership transfer, account deletion, or role-based privileges.
- The complete dashboard summaries owned by US-025.
- A general-purpose rate-limit service or externally managed cache.
- Changes to Google OAuth behavior.

## Decisions

### Keep the current human-readable invite shape

Codes remain `XXX-XXXXX`: a product prefix plus five cryptographically random characters from the
existing unambiguous alphabet. They are displayed uppercase and stored lowercase. Input accepts
case differences, surrounding ASCII whitespace, and only the expected optional hyphen. This retains
the shipped UI and database shape while the per-user limiter controls online guessing.

PostgreSQL generates suffixes with cryptographically secure bytes, retries uniqueness conflicts, and
relies on the active-code unique index as the final collision guard. Application code does not
generate or authorize codes.

Alternative: replace codes with long opaque tokens. This provides more entropy but needlessly harms
manual entry and breaks the current product format for an MVP flow already protected by authentication
and strict throttling.

### Use one database transaction per lifecycle mutation

`create_space` will set the creator membership's `onboarding_completed_at` and issue the first invite
in its existing transaction. The separate completion request is removed from the successful path.

Invite validation and redemption will call one shared transactional RPC with a validate/redeem mode.
It acquires the per-user attempt row first, checks a lock before parsing or looking up the code, then
locks a matching space before any redemption decision. Redemption inserts the member, nulls the
invite and expiry, and clears failed attempts before returning. Expected rejection is returned as a
small result code so attempt-state updates commit; unexpected exceptions roll back and therefore do
not increment failures.

Alternative: coordinate separate Supabase queries in route handlers. This cannot make capacity,
invite consumption, and rate-limit updates atomic and is unsafe under concurrent requests.

### Represent the rolling limiter in PostgreSQL

A private `join_attempt_limits` table has one row per user, a timestamp array for recent failed
attempts, and `locked_until`. The lifecycle RPC locks that row, removes timestamps at least 10 minutes
old, and serializes concurrent attempts for the same user. When five failures remain, the next request
sets `locked_until` before invite lookup. Requests during the lock only calculate `ceil(locked_until -
now())`; they never update the deadline. Successful redemption deletes the row.

The table is not exposed through client RLS; authenticated callers interact only through the narrow
RPC. A timestamp array is bounded to five entries, avoiding a log table and cleanup job.

Alternative: in-memory or serverless-instance state is bypassable across instances. An external
rate-limit service adds a dependency and still cannot share the redemption transaction.

### Enforce capacity with existing membership roles

Add a partial unique index on `(space_id, role)` for active memberships. The existing enum has only
`owner` and `partner`, so this permits at most two active rows while the existing partial unique index
on `user_id` permits at most one active membership per user. Roles remain slot labels only and MUST
NOT be used for authorization; active membership grants the same access.

Alternative: trigger-based row counts are harder to reason about under concurrency. A new slot column
duplicates the existing two-value role solely to express the same constraint.

### Replace old invite codes instead of retaining invite history

Successful redemption clears `invite_code` and `invite_code_expires_at`. Regeneration locks the space
and replaces a missing or expired code only after verifying the caller is its sole active member.
Because active codes are unique and old values are removed, no invite-history table is needed for the
required invalidation behavior.

Alternative: persist every issued token with revoked/consumed state. The product does not require an
invite audit trail, and retaining usable secrets increases storage and exposure.

### Centralize safe result mapping at the HTTP boundary

Database RPCs return stable result codes and no space data on rejection. Route handlers map all
well-formed but unavailable invite outcomes to `This invite is invalid or unavailable.` Malformed
syntax can provide format guidance because it reveals no persisted state. Lock results map to exact
`429` responses and `Retry-After`; unknown database failures map to generic `500` copy and are logged
without invite codes or personal data.

Alternative: forward PostgreSQL exception strings. That exposes lifecycle distinctions and couples
the public API to database wording.

### Align input contracts and reuse existing routing

Create and join names both use trimmed 2–100 character validation. Creation requires the existing
space name, date, and browser IANA timezone and automatically issues the invite. Client Zod validation
improves feedback, but the RPC repeats every trust-boundary check.

The existing `getActiveSpaceForCurrentUser`, welcome layout, root page, and dashboard states remain the
single routing path. Queries add `deleted_at is null` alongside `is_active`; identifier access uses a
generic not-found result. No second onboarding router or dashboard is introduced.

## Risks / Trade-offs

- [The friendly code space is smaller than an opaque token] -> Require authentication, secure random
  generation, active-code uniqueness, generic lookup errors, and the atomic five-failure limiter.
- [A database migration can fail if legacy spaces already contain duplicate active roles] -> Run a
  preflight query and resolve invalid rows before creating the unique index.
- [Bootstrap SQL and cumulative migrations can drift] -> Update canonical definitions and add one
  forward migration carrying the same changes; verify both paths in database tests.
- [The two-step validate/redeem UI permits state to change between calls] -> Treat validation as
  advisory and repeat all checks under locks during redemption.
- [A timestamp array is PostgreSQL-specific] -> Accept the coupling because lifecycle transactions
  already depend on PostgreSQL and the array is strictly bounded.
- [Generic invite errors reduce recovery detail] -> Keep format and rate-limit errors actionable;
  provide regeneration only to the authenticated sole member who can recover an expired code.

## Migration Plan

1. Preflight existing active memberships for duplicate `(space_id, role)` values and active users
   attached to unavailable spaces.
2. Add `spaces.deleted_at`, the active-role unique index, and the private rate-limit table.
3. Replace create, invite-processing, regeneration, and active-space RPC definitions and privileges in
   one forward migration; update canonical bootstrap SQL in parallel.
4. Deploy route and UI changes after the database migration so old callers continue to find their
   existing RPCs during rollout.
5. Verify fresh-schema and migrated-schema lifecycle, exact expiry, safe errors, and concurrent joins.

Rollback application code first. Database functions can then be restored while leaving additive
columns and tables in place; remove the capacity index only if legacy behavior must be restored.

## Open Questions

None. Product decisions required by US-001 are resolved in the capability specification.
