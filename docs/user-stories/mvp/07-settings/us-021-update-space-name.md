# US-021: Update Space Name

**Priority:** Must<br>
**Depends on:** US-020, US-025

## User Story

As an active member, I want to rename my active space so its shared identity reflects how its members
describe their relationship or friendship.

## Intended Outcome

Either active member can update the shared name. After success, subsequent reads use the new name
across dashboard, navigation, and settings without changing membership or ownership.

## Scope

- Name edit, client and server validation, save, cancel, pending, success, and failure states.
- Refresh of every currently rendered surface that displays the active space name.

## Business Rules

- The trimmed name is required and must be 2-100 characters.
- Either active member may update the name; the informational space creator/owner has no extra right.
- Server authorization and RLS derive and enforce active-space membership rather than trusting a
  submitted space or owner identifier.
- Missing, inactive, and inaccessible spaces return the generic not-found outcome.
- Cancel changes no persisted state. Pending saves prevent duplicate local submission, and failure
  preserves the prior persisted name plus the attempted value for retry.
- The field has an accessible label, validation is associated with it, and pending, success, and
  failure feedback is announced.

## Acceptance Criteria

- Either active member can save a valid trimmed name, and all affected views refresh to show it.
- Empty, whitespace-only, under-limit, and over-limit names are rejected without discarding input.
- Unauthenticated, inactive-member, and cross-space requests cannot change or expose the target space.
- Cancel, pending, success, failure, and retry behavior is clear and keyboard accessible.

## Decision Required

- Define conflict behavior when both active members rename the space concurrently, such as
  last-write-wins or optimistic concurrency with a conflict response.

## Verification Notes

- Test validation boundaries, trimming, cancel, refresh behavior, duplicate submit, and failure retry.
- Test equal member permission, inactive membership, altered identifiers, and cross-space access.
- Test keyboard operation, associated errors, focus behavior, and announced asynchronous feedback.
