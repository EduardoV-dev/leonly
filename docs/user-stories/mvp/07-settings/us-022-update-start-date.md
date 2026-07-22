# US-022: Update Start Date

**Priority:** Must<br>
**Depends on:** US-002, US-020, US-025

## User Story

As an active member, I want to correct my active space's shared start date so calendar-based day
counts remain meaningful and accurate.

## Intended Outcome

Either active member can replace the shared date-only start date with a valid past or current date.
After success, the inclusive dashboard counter and settings use the new value.

## Scope

- Date edit, client and server validation, save, cancel, pending, success, and failure states.
- Refresh of settings and the inclusive dashboard day counter defined by US-002.

## Business Rules

- The date is required, is stored without a time, and cannot be later than the acting member's current
  browser-local calendar date.
- The request includes the browser's IANA timezone. The server validates it and derives the local
  calendar date rather than trusting a submitted `today` value.
- Display and inclusive counting follow US-002, including the accepted brief difference between
  members in different timezones.
- Either active member may update the date; the informational space creator/owner has no extra right.
- Server authorization and RLS derive the active space from membership. Missing, inactive, and
  inaccessible spaces return the generic not-found outcome.
- Cancel changes no persisted state. Failure preserves the prior date and attempted value for retry.
- The date control has an accessible label and error association, and asynchronous feedback is announced.

## Acceptance Criteria

- Valid historic and current browser-local dates save as date-only values.
- Empty, malformed, invalid-timezone, and future-date requests are rejected without changing the
  persisted date.
- The dashboard counter and settings refresh after a successful update.
- Unauthenticated, inactive-member, altered-space, and cross-space requests cannot change or expose
  the target space.
- Cancel, pending, success, failure, retry, keyboard, and validation behavior is understandable.

## Decision Required

- Define conflict behavior when both active members update the shared start date concurrently.

## Verification Notes

- Test today, historic, future, malformed, invalid-timezone, timezone-boundary, and date-only storage.
- Test inclusive counter refresh, cancel, duplicate submit, failed save, and chosen conflict behavior.
- Test equal member permission, inactive membership, altered identifiers, and cross-space access.
- Test label and error association, keyboard use, focus behavior, and announced feedback.
