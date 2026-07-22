# US-002: Relationship/Friendship Day Counter

**Priority:** Must<br>
**Depends on:** US-027

## User Story

As an active member, I want to see the inclusive number of calendar days since my active space's
start date so the dashboard reflects our shared history.

## Intended Outcome

The dashboard prominently displays an inclusive calendar-day count from the active space
`start_date`. The start date is day 1, and the count changes when the start date changes or the
member's browser-local calendar date advances.

## Scope

- Day-count calculation and display on the dashboard.
- Recalculation after start-date changes and browser-local date changes.
- Safe handling of missing, malformed, and future stored dates.

## Business Rules

- Use calendar dates, not elapsed 24-hour durations.
- Use the active member's browser-local calendar date for display and future-date validation.
  Active members in different timezones may briefly see different counts.
- `start_date` is required and cannot be in the future.
- Invalid or missing stored data is handled safely, without showing a misleading count.

## Acceptance Criteria

- A start date equal to the member's local today displays `1 day together`.
- A start date equal to the member's local yesterday displays `2 days together`.
- Date-only calculation remains correct across month, year, leap-year, and daylight-saving
  boundaries without using elapsed 24-hour durations.
- A successful start-date update changes the displayed count without requiring a new login.
- The displayed count advances when the member's browser-local calendar date advances.
- A future date is rejected at mutation boundaries, and malformed or missing stored data never
  produces a plausible but incorrect count.
- The counter is available in one-member and two-member active spaces at supported viewports.

## Decision Required

- Define the user-visible fallback and recovery action for missing or malformed stored `start_date`.

## Verification Notes

- Use a fixed clock for today, yesterday, historic, leap-day, year-boundary, malformed, and future
  cases.
- Exercise timezones on both sides of UTC and a daylight-saving transition.
- Verify dashboard recalculation after a settings update and a local-date rollover.
