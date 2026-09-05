## 1. Database Contract

- [x] 1.1 Add a forward Supabase migration that returns the active space `updated_at` revision from
  `get_active_space_settings()` without weakening its membership-derived access rules.
- [x] 1.2 Add the authenticated rename RPC that trims and validates the name, derives the active space
  from `auth.uid()`, locks and compares `expected_updated_at`, and returns sanitized `updated`,
  `conflict`, `invalid`, or `unavailable` results.
- [x] 1.3 Add migration-invariant tests for RPC signatures, authenticated-only grants, empty
  `search_path`, equal-member authorization, identifier-free targeting, validation, and atomic stale
  revision handling.

## 2. Application Mutation Boundary

- [x] 2.1 Extend the Settings read schema and model with the opaque canonical space revision and update
  read-model fixtures and tests.
- [x] 2.2 Implement runtime-validated rename request and RPC result schemas, including the 2–100
  character trimmed-name contract and discriminated result states.
- [x] 2.3 Add the authenticated rename route that accepts only name and expected revision, invokes the
  RPC, maps invalid, conflict, unavailable, and unexpected outcomes to the designed HTTP statuses, and
  logs failures without protected data.
- [x] 2.4 Test the route for unauthenticated access, malformed and boundary input, successful canonical
  output, `409` conflict details, generic unavailable responses, and sanitized unexpected failures.

## 3. Settings Rename Experience

- [x] 3.1 Implement the colocated space-name editor hook with canonical name/revision state, preserved
  draft, synchronous duplicate-submit protection, explicit retry, cancel, success, validation,
  conflict, and recoverable failure transitions.
- [x] 3.2 Add the accessible inline space-name editor to the shared Settings section for either active
  member while keeping the start date read-only and reserving its future action layout.
- [x] 3.3 Reconcile the Settings summary and shared section immediately after success, then trigger an
  authoritative route refresh so dashboard and desktop/mobile navigation consume the persisted name.
- [x] 3.4 Add English and Spanish copy plus responsive styles for edit, cancel, save, pending, success,
  validation, conflict, current-name, accept-current, failure, and retry states with visible focus and
  announced feedback.

## 4. Interaction Verification

- [x] 4.1 Add hook tests for successful trim/save, cancellation, validation, duplicate-submit
  prevention, conflict draft preservation, accept-current, explicit retry, and recoverable failure.
- [x] 4.2 Extend Settings page tests for equal-member edit access, accessible names and field errors,
  keyboard/focus behavior, pending controls, canonical refresh, bilingual copy, and mobile-safe markup.
- [x] 4.3 Extend active-space shell and page tests to prove refreshed dashboard, desktop navigation,
  mobile navigation, and Settings consumers render the canonical renamed value.

## 5. Quality Gates

- [x] 5.1 Run focused rename, Settings, route, shell, and migration-invariant tests and resolve all
  failures.
- [x] 5.2 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
  `pnpm --filter web-app test:run`, and `pnpm --filter web-app build` successfully.
