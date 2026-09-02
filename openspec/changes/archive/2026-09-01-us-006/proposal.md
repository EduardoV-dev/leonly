## Why

Members can create and directly open hidden memories, but they have no place to browse them after
those memories leave the timeline. US-006 completes that retrieval path with a shared Private Vault
that preserves the couple's chronology without treating hidden memories as private from one another.

## What Changes

- Add an authenticated Private Vault route that lists only active Vault memories from the member's
  active space.
- Present deterministic newest-memory-date-first pages with the same bounded, recoverable cursor
  behavior established by the timeline.
- Reuse memory summaries and authorized private cover delivery while clearly identifying the Vault as
  shared by both active members.
- Add accessible loading, slow-network, empty, initial-error, load-more-error, retry, refresh, and
  responsive states.
- Link each Vault card to authorized memory detail and preserve extension regions for edit, restore,
  delete, and count capabilities delivered by later stories.
- Enable Vault navigation in the existing dashboard shell without implementing later memory
  mutations.

## Capabilities

### New Capabilities

- `private-vault`: Authorized browsing, deterministic cursor pagination, presentation, navigation,
  and feedback states for active hidden memories shared by both active-space members.

### Modified Capabilities

None.

## Impact

- Adds a Private Vault page, route-level loading/error boundaries, localized copy, feature-owned
  styles, and focused UI tests in `apps/web-app`.
- Adds an authorized Vault query and API boundary using existing active-space RLS, memory lifecycle,
  generic unavailable outcomes, and private signed-cover delivery.
- Updates route constants and desktop/mobile dashboard navigation to expose the Vault destination.
- Reuses existing memory summary and infinite-query patterns without adding a runtime dependency or
  implementing US-007 through US-009 or US-014 actions.
