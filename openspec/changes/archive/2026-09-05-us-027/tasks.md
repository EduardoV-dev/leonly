## 1. Database Contract

- [x] 1.1 Add a forward Supabase migration with an authenticated start-date RPC that accepts only the
  proposed date, IANA timezone, and expected shared-space revision.
- [x] 1.2 Implement membership-derived equal-member authorization, active-state revalidation, row
  locking, real date-only and server-derived local-date validation, and atomic optimistic locking.
- [x] 1.3 Return sanitized `updated`, `conflict`, `invalid`, or `unavailable` outcomes containing the
  canonical date and revision only after authorization permits them.
- [x] 1.4 Add migration-invariant tests for the RPC signature, authenticated-only grant, empty
  `search_path`, identifier-free targeting, equal-member access, timezone/date checks, lock ordering,
  and stale-revision handling.

## 2. Application Mutation Boundary

- [x] 2.1 Implement reusable server date-only and IANA-timezone validation that derives the acting
  member's current calendar date without accepting a client-provided `today` value.
- [x] 2.2 Add runtime-validated start-date request and RPC result schemas with discriminated updated,
  conflict, invalid, and unavailable states.
- [x] 2.3 Add the authenticated start-date route that accepts only date, timezone, and expected revision,
  invokes the RPC, maps designed outcomes to HTTP statuses, and logs failures without protected data.
- [x] 2.4 Test the route and server boundary for unauthenticated access, malformed/nonexistent dates,
  invalid timezones, historic/today/future boundaries, identifier rejection, successful output, `409`
  conflict details, generic unavailable responses, and sanitized unexpected failures.

## 3. Shared Settings State and Date Editor

- [x] 3.1 Refactor Settings to own one canonical shared-space name, start date, and revision so both
  editors capture the latest revision when editing starts and propagate successful revisions.
- [x] 3.2 Implement the colocated start-date editor hook with preserved canonical/draft dates,
  synchronous duplicate-submit protection, browser timezone submission, validation, cancel, success,
  conflict, accept-current, explicit retry, and recoverable failure transitions.
- [x] 3.3 Add the accessible inline date editor using the existing `PastDatePicker`, leaving the name
  workflow intact and updating the Settings summary immediately after success.
- [x] 3.4 Trigger an authoritative route refresh after success so the dashboard shell supplies the
  persisted date to the existing inclusive counter.
- [x] 3.5 Add English and Spanish copy plus responsive styles for edit, cancel, save, pending, success,
  date/timezone validation, conflict, current-date, accept-current, failure, and retry states with
  visible focus and announced feedback.

## 4. Interaction and Refresh Verification

- [x] 4.1 Add hook tests for historic/today saves, cancellation, client validation, timezone capture,
  duplicate-submit prevention, conflict draft preservation, accept-current, explicit retry, and
  recoverable failure.
- [x] 4.2 Extend Settings page tests for equal-member date access, accessible names and associated
  errors, keyboard/focus behavior, pending controls, canonical shared revision coordination, bilingual
  copy, and mobile-safe markup.
- [x] 4.3 Extend active-space shell and relationship-milestone tests to prove an authoritative refresh
  renders the canonical date and recalculates the inclusive counter without reauthentication.

## 5. Quality Gates

- [x] 5.1 Run focused migration, validation, route, editor, Settings, shell, and day-counter tests and
  resolve all failures.
- [x] 5.2 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
  `pnpm --filter web-app test:run`, and `pnpm --filter web-app build` successfully.
