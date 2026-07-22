# US-003: View Memories Timeline

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-025

## User Story

As a space member, I want to see our shared memories in a timeline so I can revisit our story in chronological order.

## Intended Outcome

The timeline is the core Leonly experience: a responsive chronological list of visible, active memories for the current space, ordered newest first.

## In Scope

- Photo preview, title, date, description preview, optional location, reaction count, comment count, detail link, and action menu.
- Loading, empty, error, and slow-network states.
- Bounded cursor pagination and refresh after local actions, navigation, or manual refresh.

## Business Rules

- Query only `is_active = true` and `is_hidden = false` records for the active space.
- A missing photo, description, or location is valid.
- Deleted and cross-space memories never appear or open. Hidden memories do not appear here but remain openable by active members through the Vault or an authorized direct URL.
- Order by memory date descending with a deterministic secondary key selected in OpenSpec.

## Acceptance Criteria

- [ ] Only the active space's visible, active memories appear, newest first.
- [ ] Cards show title, date, photo fallback, reaction count, comment count, and actions.
- [ ] Empty, loading, and error states are useful and responsive.
- [ ] Another space's or deleted memory returns the generic not-found outcome; an active hidden memory remains accessible to active members.
- [ ] Load-more pagination does not duplicate or skip records with equal memory dates.

## Verification

- [ ] Test scope, ordering, optional fields, empty list, and authorization failures.
