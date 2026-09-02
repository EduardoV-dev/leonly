## Why

Members can preserve and revisit memories, but they cannot correct details, update photographs, or
change where a memory appears after creation. US-007 closes that gap while protecting existing memory
and media state from partial writes and concurrent edits.

## What Changes

- **BREAKING** Move the create-memory form from `/timeline/new` to the placement-neutral
  `/memories/new` route.
- Add one authorized `/memories/[memoryId]/edit` route with every current value prefilled, reached
  only through Edit actions on Timeline and Vault memory detail pages.
- Reuse one shared form UI and responsive composition for creation and editing while keeping their
  initial state, submission behavior, and feedback distinct.
- Allow either active-space member to update title, description, date, location, placement, retained
  photos, replacement photos, and cover selection within the shared validation limits.
- Commit metadata, photo membership, cover, and placement as one observable edit while preserving the
  creator and all unrelated records.
- Reject stale concurrent mutations through optimistic concurrency rather than silently overwriting a
  partner's newer change.
- Preserve retained-photo order, append new photos in selection order, and omit manual photo
  reordering from US-007.
- Return cancellation to the detail route for the memory's initial placement and successful edits to
  the detail route for the memory's final placement.
- Refresh Timeline, Vault, detail, dashboard, and related-memory data after a successful edit.
- Add accessible loading, unavailable, validation, pending, conflict, success, and recoverable failure
  behavior using the existing Leonly editor and detail visual system.

## Capabilities

### New Capabilities

- `memory-editing`: Authorized prefilled editing, optimistic concurrency, atomic metadata and photo
  replacement, placement changes, navigation, feedback, and affected-view refresh behavior.

### Modified Capabilities

None.

## Impact

- Replaces `/timeline/new` with `/memories/new`, adds one placement-neutral edit route, reuses one
  shared editor composition, and adds localized copy and focused UI tests in `apps/web-app`.
- Adds an authorized edit read model and mutation API/server boundary with expected-version checks,
  staged media, cleanup, and generic unavailable outcomes.
- Extends memory/photo persistence and private Storage cleanup support without changing creator,
  comments, reactions, route authorization, or list ordering contracts.
- Populates only the Timeline and Vault detail action extension regions, removes Edit discovery from
  memory cards and other summaries, and invalidates existing memory query keys after success; no new
  runtime dependency or global design token is required.
