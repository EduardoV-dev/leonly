# 01. Verify and Complete the Day Counter (US-002)

**Release:** MVP. **Prerequisites:** active-space setup and settings (US-001).

## Work to do

1. Check the current dashboard counter against the acceptance criteria below; implementation status
   is unconfirmed, so do not assume the feature must be rebuilt.
2. Decide the fallback for invalid stored dates and fix any demonstrated calculation or UI gaps.
3. Verify settings changes and local-date rollover in the running app, plus deterministic date tests.

Delete this task when the acceptance criteria and verification checks pass. OpenSpec archival is not
a prerequisite for removing it.

## User Story

As an active member, I want to see the inclusive number of calendar days since my active space's
start date so the dashboard reflects our shared history.

## Intended Outcome

The dashboard prominently displays an inclusive calendar-day count from the active space
`start_date`. The start date is day 1, and the count changes when the start date changes or the
member's browser-local calendar date advances.

## Scope

- Day-count calculation and display in the dashboard route shell established by US-001.
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
