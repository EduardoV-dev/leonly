## 1. Persistent join-attempt boundary

- [x] 1.1 Configure the Upstash Redis REST client and local Redis REST proxy; keep join-attempt state out of Prisma.
- [x] 1.2 Implement serialized Redis attempt checks shared by validation and redemption: count only failed invite attempts in fixed ten-minute windows, reject requests after five failures before lookup until the current window resets, report remaining `Retry-After`, and clear failures on successful redemption or window reset.

## 2. Nest invite validation and redemption

- [x] 2.1 Add authenticated `POST /api/spaces/invite-validations` and `POST /api/spaces/memberships` DTO/controller contracts with the standard envelope, safe 400/401/404/429/500 outcomes, and no client-supplied actor ID.
- [x] 2.2 Implement shared invite normalization, validation, formatting, and generation constants in `@leonly/utils/invite-code`, generic unavailable outcomes, optional joining-name fallback, and a transactional partner join that rechecks expiry/capacity under lock, completes onboarding, consumes the invite, and maps uniqueness races safely.
- [x] 2.3 Cover both endpoints and shared invite helpers with focused tests for session isolation, normalization, padded clipboard input, fallback, malformed/unavailable codes, expiry, self-join, invalid name, failure thresholds and retry responses, transient errors, and concurrent last-slot redemption.

## 3. Same-origin join journey

- [x] 3.1 Replace Supabase RPC/sync calls with same-origin `invite-validations` and `memberships` handlers using `proxyRequest` to Nest, remove the old join handlers, and verify status, cookies, standard envelopes, and `Retry-After` pass through without leaking invite information.
- [x] 3.2 Replace Supabase auth checks on both join pages with the Better Auth active-space lookup; handle unauthenticated, already-member, and backend-failure states distinctly.
- [x] 3.3 Update the join form to interpret Nest field errors and generic envelope errors while retaining code translations, input state, field focus, and successful navigation; update focused route and flow tests.

## 4. Verification and rollout

- [x] 4.1 Validate the OpenSpec change and run focused API/web tests plus API and web-app check, typecheck, test:run, and build gates.
- [x] 4.2 Verify a Better Auth user can validate, redeem, refresh, and enter the two-member dashboard; check malformed, expired, consumed, concurrent, and locked invites without exposing space details.
- [x] 4.3 Configure Redis before deploying Nest endpoints and web callers; retain the legacy Supabase rate-limit table and invite-regeneration RPC for a later migration.

### Verification evidence

- Strict OpenSpec validation passed after aligning these artifacts with the implementation.
- API checks, both app typechecks and production builds, 80 API tests, 608 web tests, and 27 utils tests passed during implementation verification. The full web check reported 20 existing nested-ternary violations outside the invite changes; changed-file Biome checks passed.
- An isolated probe against the running local Redis REST service confirmed that five failures exhaust the fixed-window allowance. The next state read reported 538 seconds until the window boundary, rather than a new 600-second lock. The probe's identifier was reset afterward.
- Local Compose configuration is valid and Redis plus its REST proxy are running. Production Redis configuration and the complete authenticated browser join/refresh flow have not been verified.
- The requester directed that tasks 4.1-4.3 be marked complete for archive. Task 4.1's commands were run, but the full web-app check reported 20 pre-existing nested-ternary violations. The complete authenticated browser flow in 4.2 and production Redis deployment configuration in 4.3 were not independently exercised in this session; local Compose Redis configuration and service availability were verified.
