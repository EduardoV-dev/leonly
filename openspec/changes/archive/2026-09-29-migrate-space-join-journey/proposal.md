## Why

Joining a space still validates and redeems invites through a Supabase RPC, and both join pages check a Supabase session. A Better Auth user can create a space through Nest but cannot reliably join one through the same identity and data store.

## What Changes

- Add authenticated Nest invite-validation and redemption endpoints backed by the existing Prisma space and membership records.
- Use same-origin `/api/spaces/invite-validations` and `/api/spaces/memberships` requests, preserving user-facing errors while forwarding requests and Better Auth cookies to Nest; remove the old `/api/spaces/join` handlers.
- Replace Supabase auth checks on the join pages with the existing Better Auth active-space lookup; route a successful join into the persisted two-member space.
- Enforce atomic invite consumption, membership capacity, and a shared per-user allowance of five failures per fixed ten-minute Redis window across both endpoints; reject exhausted users only until that window resets.
- Share invite formatting, normalization, validation, and generation constants through `@leonly/utils/invite-code`, trimming pasted whitespace before input truncation.
- Make the optional join name and its account-name fallback explicit in the contract, matching the existing form and invite redemption behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `api-endpoints`: Specify the authenticated invite validation and redemption routes, response envelope, error codes, and rate-limit header.
- `space-lifecycle`: Specify Better Auth identity throughout join setup, shared invite-code rules, optional display-name fallback, and serialized fixed-window failed-attempt throttling when the join flow moves to Nest.

## Impact

- Nest spaces controller/service, input validation, Redis-backed attempt state, local Compose Redis, and focused API tests.
- Next.js join proxy routes, join page guards, join response handling, and focused web tests.
- Upstash Redis REST client and local Redis REST proxy. Keep Supabase invite-regeneration rate limits in place for a later migration; settings and memory operations remain separate migrations.
- Shared utils invite-code entry point, frontend workspace dependency, and focused shared/frontend/backend contract tests.
