## Context

The dashboard currently parses `start_date` and computes `differenceInCalendarDays(new Date(),
startDate)` in its server component. This makes the start date day 0, uses the server's calendar date
instead of the member's, and can pass invalid values into both the counter and formatted sidebar
copy. The database stores a non-null `date`, but the active-space response is still an external
runtime boundary and must not be trusted solely through a TypeScript assertion.

US-022 will later add the settings mutation for changing the date. This change must establish a
counter that responds when its start-date input changes without implementing that settings flow.

## Goals / Non-Goals

**Goals:**
- Calculate an inclusive count from strict date-only input and the browser's local calendar date.
- Keep the displayed count current across local-midnight rollover and refreshed start-date data.
- Prevent invalid stored data from producing either a count or formatted start-date copy.
- Reject malformed and future dates at existing mutation boundaries.
- Preserve the dashboard's current responsive visual hierarchy for one-member and two-member spaces.

**Non-Goals:**
- Build the settings screen or start-date update mutation owned by US-022.
- Store a timezone or force members in different timezones to see the same count.
- Add a date library or a general-purpose scheduling abstraction.

## Decisions

- Move browser-date-dependent rendering into a small client milestone component. It receives the
  date-only string, derives the count during render, and updates a local `today` value after mount.
  Keeping the rest of the dashboard server-rendered avoids turning the page into a client component.
- Parse only a real `YYYY-MM-DD` calendar date into a local `Date` and verify that the resulting
  year, month, and day round-trip. This rejects rollover values such as `2025-02-30` instead of
  relying on permissive parsing or the asserted RPC type.
- Use calendar-day difference plus one, never elapsed milliseconds divided by 24 hours. This keeps
  today at 1 and remains correct across daylight-saving, month, year, and leap-year boundaries.
- Schedule one timer for the next local midnight and recalculate on focus or visibility return.
  Browsers may throttle background timers, so the lifecycle events correct stale displays without
  polling.
- Treat missing, malformed, or future response values as unavailable. The milestone shows a clear
  message and retry action, and the sidebar omits its derived `Since` copy. Retry refreshes the
  route; correction through settings remains owned by US-020 and US-022.
- Tighten the existing create-space request boundary to accept only real date-only values and reject
  dates after the member's browser-local today. The database remains the final non-null/date-type
  integrity boundary. US-022 must apply equivalent validation to its future update mutation.

## Risks / Trade-offs

- [Server-rendered markup cannot know the browser's local date] -> Render a stable unavailable or
  pending counter state until the client establishes its local calendar date, avoiding a misleading
  server-derived value and hydration mismatch.
- [A midnight timer can be delayed while the tab is suspended] -> Recalculate on visibility and
  focus in addition to scheduling the next midnight.
- [Client validation can be bypassed] -> Keep strict request validation and database date constraints;
  never trust the displayed local date as authorization or persisted truth.
- [Retry cannot repair corrupt persisted data] -> It handles transient response faults now; US-022's
  settings flow will provide direct correction without expanding this story's scope.
