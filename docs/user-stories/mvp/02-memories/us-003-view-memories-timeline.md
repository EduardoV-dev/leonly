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
- Live refresh strategy when the other member adds a memory, defined in OpenSpec.

## Business Rules

- Query only `is_active = true` and `is_hidden = false` records for the active space.
- A missing photo, description, or location is valid.
- Deleted, hidden, and cross-space memories never appear or open.

## Acceptance Criteria

- [ ] Only the active space's visible, active memories appear, newest first.
- [ ] Cards show title, date, photo fallback, reaction count, comment count, and actions.
- [ ] Empty, loading, and error states are useful and responsive.
- [ ] Direct detail access to another space's, hidden, or deleted memory is denied.

## Verification

- [ ] Test scope, ordering, optional fields, empty list, and authorization failures.
