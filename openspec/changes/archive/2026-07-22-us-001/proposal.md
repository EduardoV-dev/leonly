## Why

The dashboard currently combines real active-space data with hard-coded memories and place rankings, so it presents records that do not belong to the member's space. Memory and place capabilities have not been implemented yet, so the dashboard must be truthful when those records do not exist.

## What Changes

- Remove fabricated memory and place cards from the dashboard.
- Show actionable empty states until the corresponding shared-space records exist.
- Render real visible memories and active top-rated places only after their storage and queries are delivered by their owning features.
- Complete the dashboard's active-space, member, avatar fallback, waiting, loading, and error behaviors.

## Capabilities

### New Capabilities
- `shared-space-dashboard`: Presents an authenticated member with a responsive, truthful summary of their active shared space.

### Modified Capabilities

- None.

## Impact

- Dashboard page, styles, and tests in `apps/web-app/src/features/dashboard/`.
- Active-space RPC/type may need member avatar data.
- Future memory and place features will supply the dashboard's real record queries; this change does not add their schema or write flows.
