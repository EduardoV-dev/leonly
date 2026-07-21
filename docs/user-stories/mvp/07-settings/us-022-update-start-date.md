# US-022: Update Start Date

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-002, US-020, US-025

## User Story

As a space member, I want to update the relationship/friendship start date so the day counter stays accurate.

## Intended Outcome

An active member can set a valid shared start date and the inclusive dashboard counter updates to reflect it.

## Business Rules

- The date is required and cannot be in the future.
- Store a date without a time; apply the same timezone/display rules as US-002.
- The server and RLS enforce active-space ownership.

## Acceptance Criteria

- [ ] Valid historic and current dates save successfully.
- [ ] Empty, malformed, and future dates are rejected.
- [ ] The dashboard counter updates after the setting changes.
- [ ] Cross-space changes are denied with clear failure feedback.

## Verification

- [ ] Test today, historic, future, invalid, timezone-display, and dashboard refresh cases.
