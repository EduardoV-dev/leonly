## Why

The dashboard's current day counter is zero-based, relies on the server's date, and does not safely
handle malformed or missing start dates. Members need an inclusive count based on their own local
calendar date that remains truthful as the date or stored start date changes.

## What Changes

- Display the active space's start date as day 1 and calculate later values by calendar date rather
  than elapsed 24-hour periods.
- Use the member's browser-local date and update the count when that date rolls over without
  requiring a new login.
- Refresh the displayed count after a successful start-date change.
- Reject future start dates at mutation boundaries and treat missing, malformed, or future stored
  dates as unavailable instead of displaying a plausible count.
- Show an unavailable-date message with a retry action when the stored date cannot be used.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `shared-space-dashboard`: Define inclusive, browser-local day-count behavior, live recalculation,
  invalid-data feedback, and start-date recovery.

## Impact

- Dashboard rendering, client-side date rollover behavior, and tests under
  `apps/web-app/src/features/dashboard/`.
- Active-space start-date validation at existing mutation boundaries; US-022 retains ownership of
  the future settings edit flow.
- No new runtime dependency is required; the existing date utilities and browser timer APIs are
  sufficient.
