## Context

The active-space dashboard establishes member-scoped access but has no persisted memory timeline.
The memory lifecycle foundation is a prerequisite and remains outside this change. See `proposal.md`
for motivation and `specs/memories-timeline/spec.md` for the behavioral contract.

## Goals / Non-Goals

**Goals:**
- Query and render only timeline-eligible memories for the server-resolved active space.
- Preserve stable pagination despite equal memory dates and bounded response sizes.
- Make read, refresh, empty, slow, and retry states distinguishable and accessible.
- Preserve generic not-found behavior at the memory-detail boundary.
- Deliver private cover previews without disclosing Storage object paths to the UI.

**Non-Goals:**
- Creating, editing, deleting, restoring, or moving memories.
- Building the Private Vault, realtime partner synchronization, or count/detail/action features.
- Backfilling, migrating, or changing memory lifecycle storage or its foundation-owned indexes.
- Altering the 20-row UUID cursor, deleted-at eligibility, active-space authorization, or Private Vault
  timeline exclusion.

## Decisions

### Server-resolved eligibility boundary

Resolve the authenticated member's active space on the server, then apply
`visibility = 'timeline' and deleted_at is null` in the same timeline query. The completed
foundation's active-space RLS remains authoritative; do not accept a client-supplied space identifier
as authority. Photo previews are read only through their available parent memory. This keeps the
timeline aligned with existing active-space access and prevents cross-space disclosure.

Alternative considered: filter a broad client-side memory response. Rejected because it exposes
ineligible records and makes pagination untrustworthy.

### Server-resolved private cover media

After the authorized timeline query or `get_available_memory(uuid)` read establishes that the parent
memory is available, resolve its cover photo to a short-lived signed URL on the server. Return the
resolved URL as the only cover source the UI can consume; do not return `object_path` in the timeline
or detail presentation contract. When no cover exists or signing fails, omit the resolved URL so the
existing accessible fallback renders. Signing failure is intentionally presentation degradation, not a
new authorization result, and must not reveal the path or change the eligible-memory result.

Alternative considered: expose `object_path` and let the browser construct or sign a Storage URL.
Rejected because it couples the UI to private Storage layout and risks path disclosure or unsigned
access attempts.

### Total order and keyset pagination

Use `memory_date DESC, created_at DESC, id DESC` as the total order and fetch `PAGE_SIZE + 1` rows,
where `PAGE_SIZE` is 20. Return the first 20 rows and derive the next cursor only when row 21 exists.
For a supplied tuple `(d, t, i)`, query records where `(memory_date, created_at, id)` sort strictly
after that tuple under the descending order. Consume the completed foundation's partial index for the
eligibility filters and this order.

Alternative considered: offset pagination. Rejected because inserts, deletes, and equal dates can
shift offsets, producing duplicates or gaps.

### Opaque cursor and reset recovery

Encode the last returned complete tuple as Base64URL JSON:
`{"v":1,"memoryDate":"YYYY-MM-DD","createdAt":"ISO-8601 UTC","id":"UUID string"}`. Validate
every field, including the UUID cursor identifier, before query construction and verify that the anchor
remains eligible for the member's current active space. For malformed, unsupported, or stale cursors,
return page one with `cursorReset: true`. The client replaces, rather than appends to, its list and
announces that it refreshed.

Alternative considered: return an error. Rejected because a stale cursor is expected after local
lifecycle changes and recovery should keep the timeline usable without revealing why the anchor is
unavailable.

### Read-state model

Keep initial-page state separate from append state. The first request controls page loading, slow,
empty, and page-error displays. A subsequent request controls only the load-more affordance and must
never clear loaded cards on failure. Define the slow-request threshold as 750 ms and clear the slow
status when the request settles. Refresh invalidates pages and begins again from page one; no realtime
subscription is introduced.

Alternative considered: one generic loading/error state. Rejected because it either hides useful
content during append failures or makes retries ambiguous.

### Card composition boundary

Implement the timeline card as a summary component with named slots or equivalent explicit regions
for counts, a detail link, and actions. Render only the story's summary fields now. Later stories can
populate those regions without duplicating card layout or changing the list query.

Alternative considered: add future controls directly as each story arrives. Rejected because it
couples later capabilities to timeline markup and creates inconsistent cards.

### Generic detail-route outcome

Use `get_available_memory(uuid)` as the generic null lookup for absent, deleted, unauthorized,
other-space, and otherwise inaccessible UUIDs. Its security-invoker active-space RLS contract performs
authorization before rendering detail data. Vault records are intentionally excluded from the timeline
predicate but remain eligible for an authorized direct-detail/Vault query.

Alternative considered: distinct authorization and lifecycle errors. Rejected because they disclose
record existence and state.

## Risks / Trade-offs

- [The lifecycle schema or required ordered index is unavailable] -> The completed
  `memory-lifecycle-foundation` contract is a prerequisite; verify it remains available before apply
  rather than redefining its schema or index here.
- [A member retries with a stale cursor after a lifecycle change] -> Reset to page one and replace
  the client list using the explicit `cursorReset` signal.
- [A memory changes ordering fields between page requests] -> Refresh from page one after local
  changes; the anchor validation avoids continuing from an ineligible tuple.
- [Slow responses make the page feel unresponsive] -> Show a non-blocking slow status after 750 ms,
  preserve loading semantics, and provide retry after failure.
- [Future card features increase component complexity] -> Reserve explicit extension regions but do
  not render unavailable controls in this change.
- [Signed cover resolution fails or expires] -> Omit the resolved URL and use the existing accessible
  fallback; do not retry by exposing or deriving the Storage object path in the UI.

## Migration Plan

1. Verify the completed memory lifecycle storage, authorization contract, Storage signing capability,
   and partial timeline index.
2. Add server-side signed cover resolution after the authorized timeline and detail reads without
   changing the query's cursor or eligibility predicates.
3. Release the timeline route and feedback states behind the existing active-space access boundary.
4. Roll back by disabling the route/view entry; no data migration is required because this change is
   read-only.
