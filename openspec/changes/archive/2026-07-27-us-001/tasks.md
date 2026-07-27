## 1. Database Schema and Migration

- [x] 1.1 Add a migration preflight for duplicate active space roles and memberships tied to
  unavailable spaces, with an explicit failure message instead of silent data repair
- [x] 1.2 Add `spaces.deleted_at`, the partial active `(space_id, role)` unique index, and the private
  bounded join-attempt state table to the forward migration and canonical table definitions
- [x] 1.3 Add cryptographically secure `XXX-XXXXX` invite generation with the specified alphabet,
  active-code uniqueness retries, and exact 24-hour expiry

## 2. Transactional Lifecycle Functions

- [x] 2.1 Update `create_space` to enforce the unified input contract and atomically create the first
  completed membership plus initial invite
- [x] 2.2 Replace invite validation and redemption logic with one transactional RPC that serializes
  per-user attempts, returns stable safe result codes, and blocks before parsing or lookup
- [x] 2.3 Make redemption lock the space, enforce both capacity constraints, consume the invite, clear
  failed attempts, and complete the joining membership in one transaction
- [x] 2.4 Add sole-member regeneration for missing or expired invites with atomic prior-code invalidation
- [x] 2.5 Exclude inactive and deleted spaces from active-space resolution and every lifecycle RPC, then
  apply least-privilege grants and a safe `search_path`
- [x] 2.6 Keep canonical Supabase SQL definitions and the cumulative forward migration behavior aligned

## 3. Server API Integration

- [x] 3.1 Align shared and route-level Zod schemas for 2–100 character names and strict invite
  normalization using the unambiguous alphabet
- [x] 3.2 Update create handling to use atomic onboarding completion and remove the follow-up completion
  request from the successful flow
- [x] 3.3 Update validate and redeem routes to map RPC result codes to generic invite errors, exact lock
  responses and `Retry-After`, and redacted retryable server errors
- [x] 3.4 Add the authenticated invite-regeneration route and map unauthorized or unavailable spaces to
  the generic not-found response
- [x] 3.5 Ensure post-login, welcome-layout, and post-mutation routing all reuse the server active-space
  resolver for no-member, one-member, and two-member states

## 4. Setup User Experience

- [x] 4.1 Update join fields and copy for the strict code alphabet, required joining name, generic invite
  rejection, and rate-lock feedback without exposing space data
- [x] 4.2 Update the one-member invite view to offer regeneration only for a missing or expired invite and
  refresh the displayed code after success
- [x] 4.3 Preserve accessible labels, error associations, focus behavior, responsive setup layout, and
  loading protection for all changed actions

## 5. Verification

- [x] 5.1 Add route tests for creation atomicity contracts, malformed and unavailable invites, exact
  lock response mapping, regeneration authorization, and redacted unexpected failures
- [x] 5.4 Extend setup and dashboard tests for successful create/join routing, no-active-space routing,
  one-member waiting state, two-member state, regeneration, and accessible failure recovery
- [x] 5.5 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
  `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`
