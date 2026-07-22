# US-002: Relationship/Friendship Day Counter

**Status:** Partial  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-027

## User Story

As a Leonly user, I want to see how many days we have shared together so the app feels personal and meaningful.

## Intended Outcome

The dashboard prominently displays an inclusive calendar-day count from the space `start_date`: the start date is **1 day together**, yesterday is **2 days together**. It updates after settings changes and at the next local calendar day.

## Business Rules

- Use calendar dates, not elapsed 24-hour durations.
- Use the member's browser-local calendar date for display and future-date validation. Members in different timezones may briefly see different counts.
- `start_date` is required and cannot be in the future.
- Invalid or missing stored data is handled safely, without showing a misleading count.

## Acceptance Criteria

- [ ] Today displays `1 day together`; yesterday displays `2 days together`.
- [ ] Past dates calculate accurately across years and daylight-saving changes.
- [ ] Updating the start date updates the displayed count.
- [ ] Future and invalid dates are rejected or safely handled.
- [ ] The counter works for a one-member space and at every supported viewport.

## Verification

- [ ] Unit-test today, yesterday, historic, invalid, and future dates with a fixed clock.
- [ ] Test the dashboard refreshes after a settings update.
