# US-019: Delete Place

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-015, US-025

## User Story

As a space member, I want to delete a place so I can remove locations that should no longer be part of our shared space.

## Intended Outcome

After confirmation, an active member soft-deletes an active place with `is_active = false`; it disappears from all normal lists, details, and rating operations.

## Business Rules

- Deletion is soft for MVP and idempotent.
- Related ratings are retained according to data policy but excluded from UI and aggregates.

## Acceptance Criteria

- [ ] Confirmation is required; cancellation makes no change.
- [ ] Deleted places no longer list, open directly, or accept ratings.
- [ ] Cross-space deletion is denied.
- [ ] Failure leaves the place active and shows safe feedback.

## Verification

- [ ] Test confirmation, soft deletion, repeated deletion, rating exclusion, and authorization.
