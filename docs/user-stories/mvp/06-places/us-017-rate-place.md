# US-017: Rate Place

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-016, US-025

## User Story

As a space member, I want to rate a place from 1 to 5 stars so the app can calculate our shared opinion of it.

## Intended Outcome

Each active member can create or update one rating for an active place. The displayed average uses active member ratings only.

## Business Rules

- Ratings are whole numbers from 1 through 5.
- A unique `(place_id, user_id)` constraint enforces one rating per user.
- A member may clear their rating; zero is not a rating.

## Acceptance Criteria

- [ ] A member can add, update, and clear only their rating.
- [ ] Average rating is correct for zero, one, or two member ratings.
- [ ] Averages display one decimal place.
- [ ] Invalid values, inactive places, and cross-space requests are rejected.
- [ ] Errors do not leave an incorrect optimistic average.

## Verification

- [ ] Test constraint enforcement, average calculation, updates, clearing, and authorization.
