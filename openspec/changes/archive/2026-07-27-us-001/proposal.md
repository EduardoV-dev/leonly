## Why

The current space setup flow does not fully enforce the MVP lifecycle under expiry, regeneration,
rate-limit, and concurrent-redemption conditions. US-001 makes creation, joining, and post-login
routing a single predictable, database-enforced contract.

## What Changes

- Make active-space creation atomically create the first active membership and complete onboarding.
- Enforce one active membership per user and at most two active members per space under concurrency.
- Define secure invite issuance, normalization, 24-hour expiry, regeneration, and consumption.
- Add atomic per-user failed-redemption rate limiting with the specified lock response.
- Return non-enumerating errors for rejected invite attempts and inactive or deleted spaces.
- Route authenticated users without an active space to setup and active members to the existing
  one-member or two-member dashboard shell.
- Add database-level verification for lifecycle invariants and concurrent final-slot redemption.

## Capabilities

### New Capabilities

- `space-lifecycle`: Active-space creation, membership limits, invite lifecycle and redemption,
  redemption rate limiting, and membership-aware routing.

### Modified Capabilities

None. The existing `shared-space-dashboard` specification already defines active-member access,
setup redirection, and the one-member waiting state used by this change.

## Impact

- Supabase tables, constraints, security-definer functions, policies, and migrations for spaces,
  memberships, invites, and join-attempt state.
- Next.js space create, join validation, join redemption, invite regeneration, and routing boundaries.
- Existing setup forms and invite UI for normalized codes, safe errors, lock feedback, and regeneration.
- Automated route, database invariant, expiry-boundary, and concurrency verification.
- No new runtime dependency or public breaking API is required.
