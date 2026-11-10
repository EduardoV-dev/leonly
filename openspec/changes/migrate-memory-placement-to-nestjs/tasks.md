# Tasks

## 1. Current-backend placement contract and transaction

- [x] 1.1 Add shared placement request/result types and strict API DTO validation for `visibility` and `lastKnownUpdatedAt`; verify contract/DTO tests cover both targets, exact timestamps, missing/invalid fields, and rejected ownership/space/legacy fields.
- [x] 1.2 Return precision-preserving `updatedAt` from both detail readers using a consistent content/version snapshot; update detail schemas, examples, and fixtures and verify detail tests cover sub-millisecond values without changing photos, comments, or reaction behavior.
- [x] 1.3 Implement the authenticated placement endpoint and wire its service into the memories module; verify API-owned tests permit either active member in both directions and return the standard envelope and `no-store` header.
- [x] 1.4 Make membership/space checks, memory locking, source eligibility, exact compare-and-set, and strictly advancing audit timestamps transactional with consistent lock ordering; verify focused service tests cover stale versions, repeat/already-at-target requests, controlled overlapping requests, revoked access, and rollback on failure.
- [ ] 1.5 Cover malformed, missing, inactive, deleted, other-space, inaccessible, and absent-membership requests with identical generic 404 behavior, missing sessions with 401, and unexpected failures with safe errors; verify no failure writes data, exposes target details, or uses Supabase.
- [ ] 1.6 Document placement and exact detail timestamps in OpenAPI/Scalar and verify API contract tests match the documented body, result, and failure statuses; assert that placement preserves content, creator, photos, comments, and reactions and keeps destination detail accessible to both members.

## 2. Detail-only placement experience

- [x] 2.1 Compose a placement action through the existing detail actions slot using the authenticated current-backend API client, existing design primitives, and translations; verify Timeline detail exposes only Move to Vault and Vault detail only Move to Timeline, with keyboard-accessible names and no edit/delete controls.
- [x] 2.2 Add a synchronous duplicate-submit guard, disabled pending feedback, and accessible recoverable errors; verify rapid repeated activation sends one request, failed requests do not optimistically change placement, and 401/404/409/unknown-outcome handling follows the design without automatic replay.
- [ ] 2.3 Refresh affected Timeline, Vault, dashboard, and related-memory views and replace the route with destination detail after success while preserving success feedback; verify both directions, destination button reversal, browser-back freshness, and stale-detail refresh before retry.
- [x] 2.4 Update detail and summary-surface tests/fixtures to allow the contextual action only on detail pages; verify Timeline, Vault, dashboard, recent-memory, and related-memory cards mount no placement controls or requests and existing gallery/comments/reactions remain usable.
- [x] 2.5 Remove the superseded Next.js placement route, Supabase placement adapter, and placement-only legacy types/tests after checking every caller; verify no live placement consumer uses Supabase while shared legacy edit/delete helpers remain available and targeted tests/typechecks pass.

## 3. Integration checks

- [x] 3.1 Run backend gates sequentially: `pnpm --filter 'api...' --filter 'workers...' check`, `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 typecheck`, `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 test:run`, and `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 build`; verify each passes before starting the next and record any environment blocker.
- [x] 3.2 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`, `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`; verify all pass for the completed change.
- [ ] 3.3 Exercise both moves from detail with two authorized members, including refreshed lists/destination detail, preserved related data, accessible pending/failure feedback, and an overlapping or stale request; verify expected behavior in the running app and report any unavailable runtime/database verification explicitly.

Runtime verification is blocked at sign-in: the local web app runs, but no authenticated two-member test fixture is available. Mocked tests do not establish PostgreSQL lock scheduling or browser-back behavior.
