# US-017: Rate Place

**Priority:** Must<br>
**Depends on:** US-016, US-025

## User Story

As an active member, I want to set or clear my rating for a place in my active space so our shared average reflects our current opinions.

## Intended Outcome

Each active member can create, replace, or clear their one member-owned rating for an active place. Successful mutations refresh the member's rating and the average derived from current active-member ratings.

## Scope

- Set, replace, and clear the current member's rating from place list and detail surfaces.
- Validation, pending, success, failure recovery, and refreshed average presentation.

## Inputs and Validation

- A set-rating request accepts one whole number from 1 through 5; zero, fractions, and values outside that range are invalid.
- A clear-rating request has no numeric rating value; zero never represents an unrated state.
- The server derives the rating owner from authentication and does not accept another member's identity from the client.

## Business Rules

- Rating mutations require an authenticated active member, an active space, and an active place in that space.
- Missing, inactive, soft-deleted, and inaccessible place IDs produce the same generic not-found result.
- A database uniqueness constraint on `(place_id, user_id)` prevents more than one current rating per member and place.
- Setting a rating creates or updates only the authenticated member's row; clearing affects only that member's rating.
- The average includes one rating per current active member and is absent when no active member has rated the place.
- Successful changes follow the MVP refresh behavior. A failed mutation restores or retains the last confirmed member rating and average.

## Decision Required

- Decide whether clearing deletes the rating row, stores a nullable value, or retains a soft-deleted rating record.
- Define the one-decimal average rounding rule and whether ranking uses the exact or rounded average.
- Define conflict behavior for concurrent updates or clear-versus-update requests from the same member.

## Acceptance Criteria

- An active member can create, replace, and clear only their rating for an active place in their active space.
- Repeated and concurrent requests never create more than one current rating for the same member and place.
- The average is absent for zero ratings and correct for one or two current active-member ratings.
- Invalid rating values are rejected without changing the last confirmed rating or average.
- Missing, inactive, soft-deleted, and cross-space place IDs return the same generic not-found result.
- Mutation failures expose retryable feedback and do not leave an incorrect optimistic rating or average.

## Verification Notes

- Verify all valid stars, invalid boundaries and fractions, create, update, clear, repeated requests, and uniqueness enforcement.
- Verify zero through two active-member ratings, inactive-member exclusion, concurrent mutations, authorization, and rollback after failure.
