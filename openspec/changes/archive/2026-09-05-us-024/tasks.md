## 1. Invite Contract and Database Enforcement

- [x] 1.1 Add focused validation tests for normalized and formatted invite codes, including mixed
  case, optional separator, surrounding ASCII whitespace, excluded characters, and malformed lengths.
- [x] 1.2 Add a forward Supabase migration for the per-user regeneration request limiter with bounded
  timestamp storage, authenticated-only RPC access, and no direct client table access.
- [x] 1.3 Replace `regenerate_space_invite()` in the migration so rate limiting happens before invite
  lookup, the active space is derived from `auth.uid()`, the space row is locked, and one-member
  eligibility plus missing/expired state are rechecked atomically.
- [x] 1.4 Return and document the `regenerated`, `joined`, `unavailable`, and `locked` RPC result shapes,
  preserving 24-hour expiry, unique-code collision retries, and prior-code invalidation.

## 2. Regeneration API Boundary

- [x] 2.1 Expand the regeneration route's runtime schema and response mapping for successful, joined,
  unavailable, rate-limited, unauthenticated, malformed-RPC, and unexpected-failure outcomes.
- [x] 2.2 Return the remaining whole seconds in `Retry-After` with the specified regeneration-limit
  message, and keep every unavailable or stale response free of invite, space, and member data.
- [x] 2.3 Extend route tests to cover all result mappings, generic errors, no client-selected space,
  request logging boundaries, and the absence of protected data in denied responses.

## 3. Shared Invite Status Experience

- [x] 3.1 Create the feature-owned discriminated invite state and reusable invite-status component for
  valid, unavailable, pending, failed, rate-limited, and joined presentations.
- [x] 3.2 Replace automatic regeneration and mutation retries with an explicit pending-safe action that
  handles typed API outcomes, updates successful local state immediately, and refreshes authoritative
  server data after success or stale-state responses.
- [x] 3.3 Render the valid formatted code in an accessible read-only selectable control, copy only its
  normalized value, announce success, and focus/select the manual fallback when Clipboard API access
  is absent or rejected.
- [x] 3.4 Add the expiry-boundary timer, predictable post-action focus, live feedback, visible keyboard
  focus, and responsive feature-owned styles consistent with Leonly's warm editorial visual system.
- [x] 3.5 Add component and hook tests for valid/missing/expired transitions, exact expiry, copy success,
  denied and unavailable clipboard behavior, manual selection, regeneration success and errors,
  duplicate-submit prevention, rate limiting, stale join refresh, keyboard use, and narrow layouts.

## 4. Dashboard and Settings Integration

- [x] 4.1 Update the dashboard read/render path to place the shared invite-status section before all
  dashboard content for one-member spaces and omit the section entirely for two-member spaces.
- [x] 4.2 Replace the Settings invite status card with the shared actionable experience for one-member
  spaces while retaining the non-actionable joined presentation for two-member spaces.
- [x] 4.3 Add English and Spanish invite-management copy for valid waiting, unavailable, pending,
  copied, manual-copy, regenerated, stale joined, rate-limited, and recoverable failure states.
- [x] 4.4 Extend dashboard and Settings behavior tests for first-section placement, valid and unavailable
  states, immediate regeneration, refresh persistence, two-member omission/joined status, active-space
  access failures, semantic headings, and mobile-safe rendering.

## 5. Verification

- [x] 5.1 Run focused invite validation, regeneration route, shared component, dashboard, and Settings
  tests and resolve all failures.
- [x] 5.2 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`, and
  `pnpm --filter web-app test:run`.
- [x] 5.3 Run `pnpm --filter web-app build` and `openspec validate us-024 --strict`, then review the
  migration for least privilege, safe `search_path`, concurrency ordering, rollback safety, and no
  protected-data leakage.
