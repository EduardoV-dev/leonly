## Context

See `proposal.md` for motivation and the delta specs for behavior. Settings already reads the active
space through `get_active_space_settings()`, exposes `spaces.updated_at` as an opaque revision, and
contains a version-checked inline space-name editor. The dashboard shell obtains `start_date` through
`get_active_space()` and its `RelationshipMilestone` computes an inclusive browser-local calendar-day
count whenever the supplied date changes.

The shared `PastDatePicker` already produces date-only values and disables dates after the browser's
current local date. Existing memory mutation validation demonstrates server-side IANA timezone
validation and current-date derivation. Repository rules prohibit database integration suites, so the
transactional contract is covered by route/RPC boundary tests and migration-invariant tests.

## Goals / Non-Goals

**Goals:**

- Apply the acting member's real timezone boundary without trusting a submitted `today` value.
- Give both active members equal update rights without accepting resource identifiers.
- Prevent stale updates from silently replacing a newer name or date mutation on the same space.
- Keep Settings and the existing inclusive counter on one canonical date and revision.

**Non-Goals:**

- Adding time-of-day semantics, timezone persistence, realtime synchronization, date history, or
  notifications.
- Changing the inclusive day-count formula or local-midnight refresh behavior from US-002.
- Introducing a generic settings-form framework or replacing the existing date picker.

## Decisions

### Reuse `spaces.updated_at` as the shared optimistic revision

The mutation accepts the opaque `updated_at` observed when editing starts. It locks the
membership-derived space row, revalidates active membership, and compares the stored timestamp before
updating `start_date`. A mismatch returns `conflict` with the current canonical date and revision only
after authorization succeeds. Success returns the persisted date and the new revision.

Settings will own one canonical `{ name, startDate, updatedAt }` model. Both shared-value editors will
capture the latest revision when editing begins and report their returned revision to the parent. This
prevents an editor opened after another local shared-space mutation from starting with a known-stale
token; two editors already open concurrently still receive the intended conflict.

Alternative considered: a separate start-date version column. Rejected because `updated_at` already
provides conservative compare-and-swap protection for all shared-space identity fields and was adopted
by US-026. Field-specific revisions can be introduced later if independent shared edits become common.

### Validate the timezone and local date at both server boundaries

The browser submits only `startDate`, `timezone`, and `expectedUpdatedAt`. The route validates the
date shape, real calendar value, IANA timezone, and server-derived current date for a clear `400`
response. The authenticated security-definer RPC repeats the material checks using PostgreSQL's
timezone conversion and database clock before mutation, keeping authorization, validation, locking,
and compare-and-swap atomic.

The RPC returns `updated`, `conflict`, `invalid`, or `unavailable`. The route maps these to `200`,
`409`, `400`, and generic `404`; unauthenticated requests return `401`, while malformed RPC responses
or operational failures produce a sanitized `500` with structured server logging.

Alternative considered: calculate and submit the browser's `today` value. Rejected because a client
can forge it and bypass the future-date rule. Alternative considered: validate only in PostgreSQL.
Rejected because route-level validation provides stable field errors while the repeated database check
closes the transactional trust boundary.

### Extend the existing Settings-owned editor pattern

Add a Settings-owned start-date editor and colocated hook beside the existing name editor. It reuses
`PastDatePicker`, receives the canonical date and shared revision, preserves a separate draft, and uses
a synchronous in-flight ref in addition to disabled controls. The browser timezone comes from
`Intl.DateTimeFormat().resolvedOptions().timeZone` at submission time.

On success, Settings updates the date and revision immediately, exits editing, announces success, and
calls `router.refresh()` in a transition. The authoritative refresh rebuilds Settings and supplies the
persisted `start_date` to the dashboard shell on navigation. No client cache or new read endpoint is
introduced.

Alternative considered: generalize the name editor into a polymorphic editable-setting component.
Rejected because text and calendar controls have materially different validation, focus, and conflict
copy; shared styling may be extracted only where duplication is concrete.

### Preserve attempted dates through conflicts and failures

On conflict, the hook keeps the attempted date, displays the returned canonical date, adopts the
returned revision, and offers explicit accept-current and retry actions. Retry is a new user-initiated
mutation and is never automatic. Generic failures retain both the last canonical date and draft.
Client and server validation remain associated with the date control.

Alternative considered: last-write-wins or automatic retry. Rejected because either could overwrite a
partner's explicit correction without informed consent.

## Risks / Trade-offs

- [A name update also advances the shared revision and can conflict with a date draft] → Treat this as
  a conservative shared-space conflict and return the latest canonical date and revision.
- [Browser and server clocks can straddle midnight during submission] → The server-derived date is
  authoritative; preserve the rejected draft and explain the field error if the boundary changed.
- [PostgreSQL and JavaScript timezone support can differ for unusual identifiers] → Require IANA names,
  validate at both boundaries, and treat any database conversion failure as `invalid`.
- [An authoritative refresh can preserve client component state] → Reconcile the canonical Settings
  model before refreshing and capture its latest revision when each editor starts.
- [A stale conflict response could expose the current date after membership removal] → Revalidate
  active membership under the same row lock before returning conflict details.

## Migration Plan

1. Add a forward migration creating the authenticated, membership-derived start-date RPC using the
   existing space revision.
2. Deploy the route, shared Settings state coordination, inline editor, translations, and tests in the
   same application release.
3. Verify historic/today/timezone-boundary validation, equal-member authorization, conflict ordering,
   draft preservation, focus behavior, and inclusive-counter refresh through the web suite.
4. Roll back the application before dropping the RPC if database rollback is required; the migration
   adds no table or stored-data rewrite, and already persisted valid dates remain compatible.
