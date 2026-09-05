## Context

See `proposal.md` for motivation and the delta specs for behavior. Settings already reads the active
space through the membership-derived `get_active_space_settings()` RPC and renders the name in both
its summary rail and shared-settings section. The dashboard shell reads `get_active_space()` once and
provides that server-derived model to desktop navigation, mobile navigation, and dashboard content.

The `spaces` table already has an `updated_at` timestamp maintained by a trigger. Existing comment
editing establishes the product pattern for optimistic concurrency: clients submit an observed
revision, stale writes return `409`, attempted input remains available, and the user explicitly
refreshes or retries. Repository rules prohibit database integration suites, so the transactional
contract is covered by focused web tests at the RPC boundary plus migration-invariant tests.

## Goals / Non-Goals

**Goals:**

- Make both active members equal rename actors without accepting resource identifiers from the
  browser.
- Prevent silent overwrite when two members edit the shared name concurrently.
- Keep one canonical revision token across read, mutation, conflict recovery, and refresh.
- Reuse the existing Settings visual language and server-rendered active-space reads.

**Non-Goals:**

- Adding realtime synchronization, rename history, audit UI, ownership privileges, or notifications.
- Editing the start date, membership state, invite state, or any personal setting.
- Introducing a generic settings mutation framework before another concrete mutation needs it.

## Decisions

### Use `spaces.updated_at` as the optimistic revision token

Extend `get_active_space_settings()` to return the active space's `updated_at` value and expose it in
the typed Settings read model. The client submits this opaque timestamp as `expected_updated_at`; it
does not calculate or modify it. A successful database update returns the canonical trimmed name and
new `updated_at` value.

The mutation locks the membership-derived space row, rechecks active membership, and compares the
stored timestamp with the expected revision before updating. A mismatch returns `conflict` with the
current name and revision only after authorization is confirmed. Missing or inactive state returns
the same generic `unavailable` outcome and no protected fields.

Alternative considered: add an integer version column. Rejected because `updated_at` already changes
on every space mutation and is sufficient as an opaque compare-and-swap token for this MVP. If future
space mutations need independent field-level concurrency, a dedicated revision model can replace it
in a separate migration.

### Put authorization and compare-and-swap in one RPC transaction

Add an authenticated `security definer` RPC with an empty `search_path`. It accepts only the proposed
name and expected revision, derives the active space from `auth.uid()`, validates the trimmed name,
locks the authoritative space row, and returns a discriminated JSON result: `updated`, `conflict`,
`invalid`, or `unavailable`.

The Next.js mutation route validates its request and the RPC response at runtime. It maps invalid input
to `400`, stale revision to `409`, unavailable state to generic `404`, unauthenticated state to `401`,
and malformed or unexpected failures to generic `500` with sanitized structured logging.

Alternative considered: update through the browser Supabase client under RLS. Rejected because the
route/RPC boundary provides one atomic authorization and concurrency contract, avoids accepting a
space ID, and matches existing server mutation patterns.

### Keep rename interaction owned by Settings

Create a Settings-owned inline space-name editor beside the shared-settings section, with its request
and interaction state in a colocated hook. The hook receives the canonical name and revision, keeps a
separate draft, prevents duplicate requests, and exposes domain states rather than independent
booleans. Cancel restores the canonical value without a request.

On success, the editor updates its local canonical value immediately, exits editing, announces
success, and calls `router.refresh()` in a transition. The refresh rebuilds Settings and the dashboard
shell on subsequent navigation from their existing server reads. No client cache or new read endpoint
is added.

Alternative considered: promote a generic editable-setting component. Rejected because name and date
mutations have different validation and concurrency semantics, and only one editable shared setting
exists today.

### Preserve the draft during conflicts and recoverable failures

For a `conflict` result, retain the attempted draft, display the returned canonical name, replace the
local revision with the returned current revision, and offer two explicit actions: accept the current
name or retry the preserved draft. Retry is a new user-initiated mutation against the refreshed
revision; the application never retries a state-changing request automatically.

For generic failures, retain both the previous canonical name and attempted draft and keep save
available. Validation errors remain associated with the field. Focus returns predictably to the field
for validation, the conflict recovery region for stale writes, or the updated value/edit control after
success or cancel.

Alternative considered: last-write-wins. Rejected because it silently discards another member's
explicit update to shared identity data and differs from the repository's established conflict UX.

## Risks / Trade-offs

- [Any unrelated space mutation changes `updated_at` and can cause a conservative conflict] -> Return
  the latest canonical name and revision and make retry explicit; the MVP has few space mutations and
  conservative rejection is safer than overwrite.
- [Timestamp serialization could drift between PostgreSQL and JavaScript] -> Treat the ISO timestamp
  as an opaque string, validate its format, and compare it in PostgreSQL rather than client code.
- [The Settings rail can briefly show the old name after local success] -> Update the editor result
  immediately and trigger an authoritative route refresh so all server-derived consumers converge.
- [A stale conflict response could expose a name after membership removal] -> Derive and revalidate
  active membership inside the same transaction before returning canonical conflict data.
- [Two rapid local submissions could bypass React pending state] -> Guard the request with a synchronous
  in-flight ref in addition to disabled controls, following the invite-management lesson.

## Migration Plan

1. Add a forward migration that extends the Settings read RPC with `updated_at` and creates the secure
   rename RPC with authenticated-only execution.
2. Deploy the typed read model, mutation route, inline editor, translations, and tests in the same
   application release.
3. Verify equal-member authorization, validation boundaries, conflict ordering, generic unavailable
   responses, draft preservation, focus behavior, and authoritative refresh through the web suite.
4. Roll back the application before restoring the prior read RPC and dropping the rename RPC if a
   database rollback is required; no stored data rewrite or new table requires cleanup.
