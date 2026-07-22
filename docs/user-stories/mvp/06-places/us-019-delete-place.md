# US-019: Delete Place

**Priority:** Must<br>
**Depends on:** US-015, US-025

## User Story

As an active member, I want to remove a place from my active space so it is no longer available in our shared product experience.

## Intended Outcome

After explicit confirmation, either active member can soft-delete an active place by setting
`is_active = false`. The place and ratings become inaccessible through product routes, and the cover
becomes inaccessible through product and storage routes. Retained data remains available only under
the MVP retention policy.

## Scope

- Delete entry points from place list and detail, confirmation, cancellation, and pending state.
- Success, recoverable failure, list/detail removal, and retained related-data access rules.

## Business Rules

- The server authorizes deletion from the authenticated active membership; either active member has equal delete access.
- Canceling confirmation sends no mutation and leaves the place unchanged.
- The delete mutation changes only an active place in the member's active space.
- Missing, inactive, already deleted, and inaccessible place IDs produce the same generic not-found result.
- A successful deletion removes the place from all lists and detail routes and blocks later edit and rating mutations.
- Retained ratings for a deleted place are excluded from every average and ranking. Retained cover objects are denied through storage routes.
- If deletion fails, the place remains active and the UI shows retryable feedback without claiming success.
- Permanent place, rating, and media cleanup and place restoration are outside the MVP.

## Decision Required

- Define conflict behavior when delete races with an edit, cover replacement, or rating mutation, including which operation wins and what the losing request returns.
- Decide whether deletion requires a version or last-updated precondition to protect against stale confirmation screens.
- Define post-delete navigation and success feedback for deletion initiated from list and detail views.

## Acceptance Criteria

- Confirmation is required before a delete request, and cancellation makes no change.
- Either active member can soft-delete an active place in their active space.
- After success, the place no longer lists, opens, edits, or accepts ratings, and its cover is inaccessible.
- Retained ratings for the deleted place do not affect any displayed average or ranking.
- Missing, inactive, already deleted, and cross-space IDs return the same generic not-found result.
- A failed delete leaves the place active and exposes retryable feedback.

## Verification Notes

- Verify confirmation, cancellation, successful soft deletion, repeated deletion, retained-rating exclusion, and cover denial.
- Verify failed deletion, stale confirmation, concurrent edit/rating/delete requests, inactive-space, unknown, and cross-space cases.
