## Context

See `proposal.md` for motivation. `space_members.display_name` is already the canonical value used by
Settings, comment attribution, and memory-detail creator attribution. Each membership has an
`updated_at` column maintained by the shared database trigger, but the Settings RPC does not currently
return that membership revision. Existing space-name and start-date editors establish the project's
inline editing, authenticated PATCH, database RPC, optimistic-conflict, and authoritative-refresh
patterns.

The mutation crosses a client editor, Next.js route and server boundary, and a security-definer
database function. Authorization must remain independent of any client-selected identity, and the
historical presentation requirement must not introduce denormalized author-name updates.

## Goals / Non-Goals

**Goals:**

- Use one canonical active-membership row for authorization, mutation, concurrency, and attribution.
- Match established Settings editing and recovery behavior while keeping the membership revision
  independent from the shared space revision.
- Make every trust boundary validate the normalized 2-100-character contract.
- Prove that refreshed historical reads resolve the new membership name without authored-record writes.

**Non-Goals:**

- Editing the partner's name, inactive memberships, authentication-provider metadata, email, or avatar.
- Realtime synchronization across sessions or already-open historical views.
- A reusable generic field-editor abstraction or changes to global visual tokens.
- Rewriting comments, memories, locations, or other authored rows.

## Decisions

### Use the membership `updated_at` value as an independent optimistic revision

`get_active_space_settings()` will add `updated_at` to each active-member object. The Settings read
model will retain it on `SettingsMember`, and the current-member editor will capture that revision
when editing begins. The mutation will compare it under a row lock and return a new membership revision
after success.

This avoids coupling a personal setting to `spaces.updated_at`, which would create false conflicts with
space-name or start-date changes. A new integer version column was considered but rejected because the
existing trigger-maintained membership revision already supplies the required compare-and-swap token.

### Mutate through a membership-derived database RPC

Add `update_active_membership_display_name(p_display_name text,
p_expected_updated_at timestamptz)` as a security-definer function with an empty search path,
schema-qualified objects, and execute permission only for `authenticated`. It will:

1. Reject missing authentication, invalid input, or missing expected revision without querying a
   client-selected target.
2. Select and lock the authenticated user's available membership joined to an available space and
   user profile.
3. Revalidate availability after the lock, compare the membership revision, and return `unavailable`,
   `invalid`, `conflict`, or `updated` as a strict JSON outcome.
4. Update only `display_name`; the existing trigger advances `updated_at`.

Direct table updates and client-selected membership IDs were rejected because they broaden the attack
surface and make altered-identity requests distinguishable. An application-only compare-and-swap was
rejected because authorization and concurrency must be atomic with the write.

### Keep the HTTP contract identity-free and runtime validated

Add `PATCH /api/membership/display-name` with a strict body containing only `displayName` and
`expectedUpdatedAt`. A server-only Settings service will validate both request and RPC response shapes,
map database snake_case values to domain values, and distinguish invalid, unavailable, conflict, and
unexpected failure outcomes. The route will preserve the existing generic client-error conventions and
will not expose database details.

Using a dynamic `/api/members/:id` route was rejected because an identifier is unnecessary and would
invite clients to treat it as authorization. Updating through authentication-provider APIs was rejected
because this value belongs to a space membership, not the global account profile.

### Reuse the established Settings editor behavior without premature abstraction

Add a page-owned `DisplayNameEditor` and `useDisplayNameEditor` beside the Settings page. The hook will
own canonical value, draft, captured revision, validation attempt, pending guard, conflict, and outcome
state. On conflict it will retain the draft while adopting the returned canonical name and revision;
the member can accept the current name or explicitly retry the draft. On success it will update the
Settings-owned active-member state and call `router.refresh()`.

The editor will reuse the existing Settings button and CSS language, focus the field on entry, associate
validation through `aria-describedby`, and announce status through `role="status"` or `role="alert"`.
A generic editable-setting abstraction was considered but rejected because the three fields have
different validation, ownership, conflict copy, and response contracts.

### Preserve membership-backed historical attribution

No authored table receives a display-name column or update. Existing comment and memory-detail reads
already join `space_members` at read time. Their focused tests will verify that changing the membership
fixture changes returned attribution while the authored fixture remains unchanged. Any additional
existing place/creator read found during implementation must follow the same join-at-read rule.

An update fan-out across authored records was rejected because it risks partial writes, destroys the
historical identity relationship, and makes future corrections expensive and inconsistent.

## Risks / Trade-offs

- [Timestamp precision causes an unchanged revision after rapid writes] -> PostgreSQL's trigger uses a
  transaction timestamp; set the successful membership revision from the locked updated row and add a
  database concurrency test covering rapid sequential sessions. If the test proves transaction-level
  reuse is possible across the relevant calls, use `clock_timestamp()` inside this RPC update.
- [Expanding the Settings RPC breaks strict response parsing] -> Update the SQL payload, Zod schema,
  read-model mapping, fixtures, and tests in the same work unit.
- [A stale open historical view keeps an old client cache] -> The contract guarantees current data after
  refresh, not realtime propagation; successful Settings save triggers authoritative route refresh and
  later reads continue to resolve from membership.
- [Security-definer logic bypasses RLS] -> Keep target derivation inside the function, revalidate active
  membership and profile state under lock, use no client identity parameters, restrict grants, and test
  inactive and cross-space attempts.

## Migration Plan

1. Deploy the additive RPC migration and expanded Settings read payload.
2. Deploy server parsing, route, UI, translations, and tests that consume the membership revision.
3. Verify active-member update, conflict recovery, inaccessible outcomes, and refreshed attribution.
4. Roll back application code before dropping the additive RPC if rollback is required; existing
   membership data and authored records require no data migration or restoration.
