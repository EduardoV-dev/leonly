# US-003: View Memories Timeline

**Priority:** Must


**Depends on:** US-025

## User Story

As an active member, I want to see our shared memories in a timeline so I can revisit our story in chronological order.

## Intended Outcome

After entering their active space, an active member sees that space's visible, active memories in newest-memory-date-first order. The timeline excludes memories in the shared Private Vault and soft-deleted memories, supports deterministic bounded pagination, and remains usable when data is loading, absent, slow, or unavailable.

## Scope

- Each memory card shows its title, date, cover-photo preview or fallback, optional description and location previews, reaction count, comment count, detail link, and available actions.
- Initial loading, load-more, empty, slow-network, and failed-read states.
- Refresh after local actions, navigation, or manual refresh; realtime partner updates are not required.

## Business Rules

- Only visible, active memories belonging to the active space appear.
- A missing photo, description, or location is valid and does not prevent the memory from appearing.
- Memories are ordered by memory date descending, followed by a deterministic secondary order.
- Bounded cursor pagination preserves that order when multiple memories have the same date and when additional pages are loaded.
- Memories in the shared Private Vault do not appear in the timeline but remain accessible to either active member through the Vault or an authorized direct URL.
- Missing, inactive, soft-deleted, and inaccessible memory IDs produce the same generic not-found outcome.
- A failed initial read shows a retryable page error; a failed load-more request keeps already loaded memories visible and can be retried.

## Acceptance Criteria

- An active member sees only the active space's visible, active memories, ordered newest first.
- Cards show the required summary fields, valid optional fields, counts, actions, and a photo fallback when no cover exists.
- Empty, loading, slow-network, failed-read, and load-more states are understandable and responsive.
- Loading additional pages neither duplicates nor skips memories with equal memory dates.
- A memory in the shared Private Vault is absent from the timeline but remains available to either active member through an authorized detail route.
- Missing, inactive, soft-deleted, and inaccessible memory IDs render the same generic not-found outcome without revealing record existence.

## Decision Required

- Define timeline page size, deterministic secondary ordering, cursor fields and format, and invalid or stale cursor behavior.

## Verification Notes

- Verify active-space scope, ordering, equal-date pagination, optional fields, counts, and the empty list.
- Verify initial-read and load-more failures, retries, direct refresh, and slow-network feedback.
- Verify shared Private Vault exclusion and generic not-found behavior for missing, inactive, soft-deleted, and inaccessible memories.
