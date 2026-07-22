# US-016: View Place Detail

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-014, US-025, US-029

## User Story

As a space member, I want to view a place's details so I can see its rating, budget, description, and related information.

## Intended Outcome

The detail view clearly presents available place data: cover photo, name, category, description, location, original and preferred-currency budget, average rating, the current user's rating, creator, and creation date.

## Business Rules

- Missing optional data must render safely.
- Only active places in the active space can be viewed.
- The detail page provides valid edit, delete, and rating entry points.
- Currency conversion follows US-029 and never blocks the page when no rate is available.

## Acceptance Criteria

- [ ] Members can view only their active space's active places.
- [ ] All optional fields have safe fallbacks.
- [ ] Deleted and cross-space direct routes are denied.
- [ ] The page handles loading, error, and responsive states.

## Verification

- [ ] Test permitted detail, missing optionals, inactive place, and cross-space access.
