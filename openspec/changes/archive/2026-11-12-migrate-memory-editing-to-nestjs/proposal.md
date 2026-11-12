# Proposal

## Why

US-007's shared editor still reads and mutates Supabase and cannot edit current-backend memories.
Migrate it using creation's existing upload, attachment, outbox, and asynchronous image-processing flow.
Saving an edit must preserve retained photos without requiring a durable edit operation or waiting for
new photo processing.

## What Changes

- Migrate editor reads and saves to authenticated NestJS APIs backed by the existing `Memory`,
  `MemoryFile`, `File`, and `OutboxEvent` models. Keep the existing route and shared create/edit form.
- Commit validated metadata, placement, selected photo associations, cover, removal state, and new-photo
  outbox events in one version-checked transaction. Report save success after that transaction commits.
- Preserve retained photos and ready variants without rewriting or reprocessing them. Attach only newly
  added uploads for asynchronous processing; show an accessible fallback in their positions until ready.
- Remove explicitly deselected photos when Save commits, even if new photos are still processing.
  There is no delayed swap, old-to-new replacement mapping, or restoration after a new-photo failure.
- Use exact timestamp concurrency protection without an edit idempotency key or durable attempt.
  **BREAKING**: replace historical replay-of-original-result guarantees with refresh-based recovery
  after an uncertain response; never silently rebase or resubmit against a refreshed timestamp.
- Restore Edit only on authorized Timeline and Vault detail, preserving migrated Delete and placement.
- Adopt existing 300-second signed GET URLs for editor previews. **BREAKING**: replace legacy opaque
  media URLs and immediate revocation; issued URLs may work until effective expiry after removal or
  access revocation. Removed files remain attributed and non-serving for deferred physical cleanup.
- **BREAKING**: save completion no longer waits for every new image variant. Later image failures do
  not roll back saved metadata, retained photos, or explicit removals.

## Capabilities

### New Capabilities

None. Extend the existing memory and file capabilities.

### Modified Capabilities

- `memory-editing`: Current-backend editor, atomic save, independently processed additions, retained
  photo continuity, immediate committed removals, conflicts, and uncertain-response recovery.
- `memory-detail`: Edit beside existing actions; ready retained photos alongside new-photo fallbacks.
- `api-endpoints`: Editor snapshot and single save operation, exact timestamps, signed previews, and
  committed-save versus image-readiness semantics.
- `file-upload-lifecycle`: Existing exclusive attachment and file claims for new edit uploads;
  retained-photo preservation, committed removal, and deferred cleanup.
- `memory-image-generation`: Existing worker handles creation and edit attachments independently;
  no detached edit preparation or memory-finalization authority.
- `memory-lifecycle`: Final associations publish on Save while per-file readiness remains independent.
- `transactional-outbox`: New-photo events commit with edit attachments and publish after commit.

## Impact

- `apps/api`: Authorized editor snapshot/save, strict DTOs, version-checked transactions, existing upload
  claims and publisher integration, OpenAPI, and application-owned tests.
- `packages/utils`: Shared snapshot/save contracts; reuse the deployed creation image-event shape.
- `apps/workers`: Verify existing attached-file processing also handles edits and cannot revive removed
  files; no staged-edit context, new event version, or automatic edit finalization.
- `apps/web-app`: Current-backend loader, upload/save transport, detail Edit links, fallbacks, uncertain
  response recovery, and affected-view refresh; remove only verified edit-only Supabase consumers.
- OpenSpec and US-007 documentation: Align save, processing, retry, signed-media, and cleanup promises.
  Sync/archive the completed deletion change before syncing overlapping deltas here.
- No new persistence model, attempt/reservation table, database migration required by this design,
  operation-status API, image-readiness polling protocol, cleanup scheduler, automatic outbox
  reconciler, dependency, or realtime update mechanism.
