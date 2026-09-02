## Context

See `proposal.md` for motivation and `specs/memory-editing/spec.md` for observable behavior. The app
already has separate Timeline and Vault detail routes, a shared detail renderer with action extension
regions, a create-memory editor at `/timeline/new` with private photo staging, active-space
authorization, short-lived photo URLs, deterministic list queries, and TanStack Query invalidation.

US-007 crosses authorized reads, route context, form reuse, private uploads, database transactions,
Storage cleanup, optimistic concurrency, and cache refresh. The current creation attempt workflow is
not safe to reuse unchanged because an edit must preserve an already available memory if any later
step fails.

## Goals / Non-Goals

**Goals:**

- Move creation to `/memories/new` and use the same shared editor composition at one
  `/memories/[memoryId]/edit` route.
- Expose Edit only from direct Timeline and Vault detail pages.
- Commit metadata, placement, final photo membership, order, and cover as one version-checked change.
- Keep prior memory and photo access intact until the replacement state commits.
- Reuse creation validation, photo variants, design language, and detail action extension points.
- Provide deterministic navigation and stale-edit recovery without silently merging partner changes.

**Non-Goals:**

- Free-form photo reordering, image cropping, rotation, captions, or other media editing.
- Field-level merge, collaborative editing, realtime partner updates, or audit history.
- Standalone US-008 move, US-009 restore, or US-014 delete controls beyond placement changes made
  inside an authorized edit.
- Editing creator attribution, comments, reactions, creation time, or identifiers.
- Permanent synchronous deletion of unreferenced private objects.

## Decisions

### Use placement-neutral memory routes around one shared editor

Creation moves from `/timeline/new` to `/memories/new`, and both Timeline and Vault memories use
`/memories/[memoryId]/edit`. The thin edit route authorizes the memory without trusting placement from
the client, records its initial persisted visibility for cancel navigation, and renders the shared
feature-owned editor. Cancel returns to the detail route for that initial visibility. Save uses the
final persisted visibility to navigate to `/memories/[memoryId]` or `/vault/[memoryId]`.

This keeps create and edit URLs owned by the memory resource rather than one possible placement,
removes duplicate route boundaries, and prevents editor implementations from drifting. Edit links are
rendered only through the direct Timeline and Vault detail action regions; list, recent, dashboard, and
related-memory cards remain focused on opening details. The detail renderer places its action region in
the preserved-by footer. Source order keeps actions before attribution for mobile, while responsive grid
areas place attribution left and actions right on widths where both fit on one row.

Alternatives considered:

- Separate Timeline and Vault edit routes duplicate route boundaries and make visibility appear to be
  part of edit authorization when the server can derive it from the memory.
- A client `returnTo` parameter introduces an open-redirect/allowlist boundary; initial persisted
  visibility provides deterministic cancel navigation without it.
- Edit links on cards add competing actions to summary surfaces and make accidental editing easier.
- Returning to a list after every save loses the user's detail context and is confusing when placement
  changes.

### Extract the exact shared memory form UI from creation

Promote the existing field, placement, photo-picker, action, responsive layout, validation placement,
and accessibility composition so `/memories/new` and `/memories/[memoryId]/edit` render the same form
UI. Creation and editing keep separate hooks and submit boundaries because their initial state,
request shape, idempotency lifecycle, feedback copy, and success navigation differ. The shared form
receives domain-oriented draft state and actions rather than owning network behavior.

Existing photos use a retained-photo model containing only authorized photo IDs and signed preview
URLs. New photos keep browser `File` objects and local object URLs. UI state uses a discriminated union
so retained and new photo operations cannot accidentally expose or require Storage paths.

Alternatives considered:

- Forking or visually recreating the creation page would make future layout, validation, and
  accessibility fixes drift.
- Generalizing creation and edit into one large request hook couples two different transactional
  workflows and makes rollback behavior difficult to reason about.

### Preserve retained order and append replacements

Retained photos are sorted by their persisted position on the server regardless of client submission
order. New photos are appended in browser selection order. The member may choose any retained or new
photo as cover, but US-007 exposes no drag handle or ordering control.

This resolves ordering deterministically with the smallest UI and matches creation's current no-reorder
contract. A future story can introduce explicit ordering semantics without guessing from DOM order.

Alternatives considered:

- Drag-and-drop ordering adds keyboard interaction, touch behavior, persistence rules, and conflict
  semantics not required to correct a memory.
- Treating client retained-ID order as authoritative creates an undeclared reorder feature and makes
  tampered requests behaviorally significant.

### Use an edit read model with an opaque version token

The authorized edit resolver returns editable metadata, initial persisted visibility, ordered retained
photo IDs with signed editor previews, cover ID, and an opaque version token derived from the current
memory `updated_at`. The browser sends that token back but cannot use it to establish authorization.

Before finalization, a database transaction locks and revalidates the active memory, active-space
membership, expected version, retained photo ownership, final cover, and final placement. A mismatched
version returns a conflict with no write. The UI does not attempt a field-level merge; it offers to
reload current values.

Alternatives considered:

- Last-write-wins silently destroys a partner's newer edit or lifecycle mutation.
- Holding a database lock while files upload is unsafe and creates long transactions.
- Server-side field merging cannot safely reconcile photo removal, cover choice, and placement.

### Add an edit-specific idempotent staging workflow

Add server-only edit-attempt and staged-photo records keyed by authenticated member plus UUID
idempotency key and normalized request fingerprint. Reserve the attempt and stage replacement object
paths before upload. New photo variants remain inaccessible because they are not referenced by an
available `memory_photos` row.

After all uploads succeed, one security-definer finalization RPC validates the expected version and
atomically updates metadata, visibility, retained/new photo rows, deterministic positions, cover, and
the completed attempt outcome. A retry of the same completed attempt returns that outcome. Changed
input with the same key is rejected.

If upload or finalization fails, cleanup removes new staged objects and leaves the existing memory
unchanged. After successful finalization, removed photo rows no longer authorize old objects; durable
cleanup metadata allows those now-inaccessible objects to be deleted asynchronously or by the existing
cleanup entry point.

Alternatives considered:

- Updating metadata before uploads exposes a partial edit.
- Uploading directly to final referenced rows can make failed replacement objects readable.
- Reusing creation attempts obscures different ownership and rollback invariants and risks treating an
  existing memory as an incomplete creation.

### Refresh all affected memory projections after success

The client invalidates the memory query-key root after a completed edit before navigation. Server
detail routes resolve current data on navigation, while Timeline and Vault infinite queries restart
from page one when next mounted. This handles title/date/cover changes and eligibility changes without
attempting fragile manual cache surgery across grouped pages.

The editor uses the app's existing global Sonner integration to display a localized success toast before
navigating to the clean destination detail URL. This avoids persistent query-state alerts and repeated
announcements after refresh. Realtime partner updates stay out of scope.

Alternatives considered:

- Patching every cached page is error-prone when memory date or visibility changes ordering and page
  membership.
- Full browser reload discards application state and is unnecessary.

### Render the shared Leonly creation editor UI

The edit screen renders the same shared form presentation as creation inside the existing authenticated
shell, including its responsive layout, field geometry, photo cards, placement choices, motion curve,
and action hierarchy. Edit-specific copy, retained/new photo labels, loading skeleton, conflict panel,
and success feedback are supplied through the edit state without creating a parallel form. The
reusable implementation brief is in `ui-prompt.md`.

## Risks / Trade-offs

- [Edit finalization spans database and Storage systems] -> Stage unreadable replacements first,
  finalize database state atomically, and durably track both failed new objects and inaccessible old
  objects for cleanup.
- [An old object's physical deletion may lag the successful edit] -> Remove its authorizing metadata
  in the transaction so product and Storage reads fail immediately; treat physical deletion as cleanup.
- [The `updated_at` token changes for unrelated future mutations] -> Prefer a safe conflict and reload
  over silently overwriting; keep the token opaque so its representation can evolve.
- [Shared form extraction could regress creation] -> Keep creation's hook and API unchanged and retain
  its current behavior tests while adding edit-specific tests.
- [Moving through edit overlaps US-008 and US-009] -> US-007 supports placement as part of a broader
  edit only; dedicated quick actions and their post-action UX remain owned by those later stories.
- [Signed retained-photo URLs may expire during a long edit] -> Expiry affects preview display only;
  retained IDs remain the mutation contract and route retry resolves fresh URLs.

## Migration Plan

1. Add edit-attempt, staged replacement, cleanup, and atomic finalization database support with all
   tables private and RPC execution restricted to the server role where appropriate.
2. Deploy the authorized edit read and mutation server boundaries without exposing UI actions.
3. Move creation to `/memories/new`; deploy the shared editor, unified edit route,
   loading/error/not-found boundaries, and detail-only action links together while updating all
   internal create-memory links.
4. Verify create-memory behavior, Timeline/Vault ordering, direct detail authorization, private media,
   conflict handling, and cleanup before enabling the edit action in production.
5. Roll back by removing detail Edit actions and the edit route first and restoring the prior internal
   create-memory route links; existing memories remain compatible. Keep attempt/cleanup records until
   staged objects are reconciled, then remove unused edit infrastructure in a later migration if
   necessary.
