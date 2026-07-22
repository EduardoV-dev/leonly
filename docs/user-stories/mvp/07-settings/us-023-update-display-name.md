# US-023: Update My Display Name

**Priority:** Must<br>
**Depends on:** US-020, US-025

## User Story

As an active member, I want to update my membership display name so shared content identifies me the
way I choose within my active space.

## Intended Outcome

The authenticated member can update only their current active membership display name. The setting
is independent of the authentication-provider profile and changes historical presentation without
rewriting authored records.

## Scope

- Display-name edit, client and server validation, save, cancel, pending, success, and failure states.
- Refresh of views that resolve an author or creator through the current active membership.

## Business Rules

- The trimmed display name is required and must be 2-100 characters.
- Identity is derived from the authenticated active membership; submitted membership, user, or space
  identifiers cannot redirect the update.
- A member cannot update the other active member's display name through UI, API, or altered payload.
- Reads resolve the current membership display name, so the update changes historical comments,
  memories, and place metadata without rewriting those records.
- Missing, inactive, and inaccessible memberships return the generic not-found outcome.
- Cancel changes no persisted state. Failure preserves the prior name and attempted value for retry.
- The field has an accessible label and error association, and asynchronous feedback is announced.

## Acceptance Criteria

- A member can update only their own current active membership display name.
- Empty, whitespace-only, under-limit, and over-limit names are rejected without discarding input.
- The new current membership display name appears in settings and affected historical views after refresh.
- Partner-name, inactive-membership, altered-identity, and cross-space changes are denied without
  exposing target membership data.
- Cancel, pending, success, failure, retry, keyboard, and validation behavior is understandable.

## Decision Required

- Define conflict behavior for concurrent display-name updates from multiple sessions belonging to the
  same membership.

## Verification Notes

- Test self-update, validation boundaries, trimming, cancel, duplicate submit, and failure retry.
- Test forbidden partner update, inactive membership, altered identifiers, and cross-space access.
- Test refreshed historical display data without record rewrites and the chosen conflict behavior.
- Test label and error association, keyboard use, focus behavior, and announced feedback.
