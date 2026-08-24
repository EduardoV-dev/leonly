# Proposal: Memory Lifecycle Foundation

## Intent

Unblock US-003 by establishing the persisted memory and photo-metadata contract it needs. This
separates foundational storage and authorization from US-004 creation behavior, removing the current
dependency cycle without prematurely building the creation product experience.

## Scope

### In Scope
- Use UUID primary keys for application-owned `spaces`, `space_members`, `memories`, and
  `memory_photos`; retain UUID identifiers for existing `users` and `join_attempt_limits`.
- Persist space-owned memories with creator, content, memory date, lifecycle timestamps, soft deletion,
  and explicit `timeline` or `vault` visibility. A `NULL` `deleted_at` means the record is available.
- Persist ordered photo metadata and an optional cover-photo reference with relational integrity.
- Enforce access through the authenticated user's session-derived available membership and return no
  distinguishable record for missing, deleted, other-space, or unauthorized memories. Photo availability
  is inherited from its parent memory.
- Configure a private Supabase Storage bucket for photo objects. Each `memory_photos.object_path` SHALL
  reference an object under its owning space's path, and only available members of an available memory's
  space can read its metadata or download it.
- Resolve cover-photo previews through a server-side authorized resolver that establishes memory
  availability before issuing a short-lived signed URL.
- Add constraints and indexes supporting ownership checks and US-003 timeline eligibility/order.

### Out of Scope
- End-user memory creation UI or creation API.
- Creation or upload UI/API, image-content validation, partial-write cleanup, retries, idempotency, or
  other binary-lifecycle behavior.
- Timeline, Vault, detail, editing, deletion, restoration, and photo-management UI.

## Capabilities

### New Capabilities
- `memory-lifecycle`: Relational memory/photo metadata, independent visibility and soft-deletion state,
  and active-space membership authorization.

### Modified Capabilities
- None.

## Approach

Add PostgreSQL memory and photo-metadata tables plus a `timeline | vault` visibility enum. Use foreign
keys and uniqueness/check constraints to preserve UUID ownership, photo order, and same-memory cover
selection. Replace `is_active` lifecycle semantics on users, spaces, members, and memories with
`deleted_at`; `NULL` denotes availability. Create a private Storage bucket whose space-scoped object names
match `memory_photos.object_path`, and use `storage.objects` RLS to apply the same available-membership
and parent-memory checks as metadata access. A server-only resolver first establishes memory availability,
then creates a short-lived signed URL for its cover; it never exposes public URLs or service-role access to
clients. Index foreign keys, authorization predicates, and the available timeline order required by
US-003. Revise the baseline and foundation migrations, then reset the local database; no existing data
needs preservation.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | Modify | UUID keys, deleted-at lifecycle model, memory schema, private bucket, object RLS, integrity, indexes, and lookup boundary |
| `apps/web-app/src/features/memories/` | Modify | Server-authorized short-lived cover-preview URL resolver and consumer handoff |
| `openspec/changes/us-003/` | Unblocked | Consumes the foundation without changing its timeline scope |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cover references a different memory | Med | Enforce same-memory relational integrity |
| RLS leaks lifecycle or tenant state | Med | Reuse available-membership checks and verify indistinguishable absence |
| A private photo becomes readable outside its memory's space | Med | Bind `storage.objects.name` to `memory_photos.object_path` and require an available parent memory and membership in the SELECT policy |
| A signed URL bypasses availability checks | Low | Create it only in the server resolver after the existing available-memory boundary succeeds |
| Timeline reads regress at scale | Low | Match partial composite indexes to eligibility and ordering |

## Rollback Plan

This foundation has no data-preservation requirement. Revise the baseline and foundation migrations,
reset the local database, and recreate the schema from migrations. Future populated-environment changes
require a separate data-safe migration plan.

## Dependencies

- Existing UUID `users` and `join_attempt_limits` identifiers; `join_attempt_limits` remains transient and
  unchanged.

## Success Criteria

- [ ] The database preserves valid UUID-based memory lifecycle, ordered photo metadata, and cover relationships.
- [ ] Only current available members can resolve their available space's available memories and metadata.
- [ ] Only current available members can obtain short-lived cover previews from the private photo bucket.
- [ ] Unavailable memory states remain non-enumerating, and US-003 can proceed without US-004 creation.
