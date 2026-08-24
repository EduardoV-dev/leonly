## Why

Available members can enter their shared-space dashboard but cannot yet browse their persisted shared
memories. A timeline is needed to let members revisit timeline-visible, available memories reliably
without exposing Vault, deleted, or inaccessible records.

## What Changes

- Add an active-space memories timeline with newest-memory-date-first cards and optional summary
  fields.
- Define deterministic, bounded cursor pagination that neither duplicates nor skips equal-date
  memories.
- Define private cover-media delivery: the server resolves a short-lived signed URL only after an
  authorized timeline or detail read, while the UI never derives a Storage URL from `object_path`.
- Define loading, empty, slow-network, initial failure, load-more failure, retry, and refresh
  behavior for the timeline.
- Define generic not-found behavior for unavailable memory detail routes and preserve Private Vault
  access outside the timeline.

## Capabilities

### New Capabilities
- `memories-timeline`: Viewing eligible shared memories in a deterministic, paginated timeline.

### Modified Capabilities
- None.

## Impact

- Affects the authenticated active-space dashboard and future memory detail route.
- Consumes the UUID-based persisted memory and photo foundation supplied by the completed
  `memory-lifecycle-foundation` capability, including active-space RLS and
  `get_available_memory(uuid)`; this change does not create or mutate memories or alter Storage
  object paths.
- Adds scoped data-query, route, card, feedback-state, and test work in the web application.
