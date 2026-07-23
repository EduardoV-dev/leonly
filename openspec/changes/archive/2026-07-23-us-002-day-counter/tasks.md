## 1. Calendar-date rules

- [x] 1.1 Add a dashboard-owned utility that strictly parses real `YYYY-MM-DD` values and returns an
  inclusive browser-local calendar-day count or an unavailable result.
- [x] 1.2 Add fixed-clock tests for today, yesterday, historic dates, month/year/leap-day boundaries,
  daylight-saving transitions, future dates, and malformed or missing values.

## 2. Mutation validation

- [x] 2.1 Tighten create-space client and API validation to reject empty, malformed, nonexistent, and
  browser-local future start dates, submitting and validating the browser's IANA timezone where the
  server needs local-today context.
- [x] 2.2 Keep the create-space database function as the final date integrity boundary and test that
  invalid requests do not create or alter space data across UTC-offset boundaries.

## 3. Live dashboard counter

- [x] 3.1 Replace the server-derived count with a focused client milestone component that calculates
  after mount and refreshes at local midnight and after focus or visibility return.
- [x] 3.2 Render the inclusive singular/plural count for valid dates in one-member and two-member
  spaces, and recalculate whenever refreshed active-space data supplies a different start date.
- [x] 3.3 For unavailable dates, omit all derived date copy and show a clear unavailable message with
  a route retry action.
- [x] 3.4 Add dashboard behavior tests for local timezone differences, midnight rollover, refreshed
  start dates, invalid-data fallback, retry, and supported responsive states.

## 4. Verification

- [x] 4.1 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
  `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`.
