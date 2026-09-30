## Context

See [proposal.md](proposal.md) for motivation. Before this migration, the browser posted to same-origin `/api/spaces/join/validate` and `/api/spaces/join`, whose Next handlers synced a Supabase user and called `process_space_invite`. Join code/name pages also checked `supabase.auth.getUser` before consulting the Nest-backed active-space read. The implemented migration replaces these URLs with `/api/spaces/invite-validations` and `/api/spaces/memberships`. Nest already has a Better Auth guard, a `SpacesService`, Prisma models for spaces and memberships, and a generic Next-to-Nest `proxyRequest` helper. The Nest database does not have join-attempt state; the old Supabase `rate_limits` table and RPC are not a reliable boundary for Better Auth identities.

The join contract preserves safe invite errors, atomic two-member capacity, and **failed-attempt** limiting. It uses the implemented Redis fixed-window allowance rather than the earlier rolling-window and separate-lock proposal. The old RPC's `consume_rate_limit` counts every request instead; successful validation does not consume the new failed-attempt allowance.

## Goals / Non-Goals

**Goals:**

- Validate and redeem the same persisted invite produced by Nest creation, under the current Better Auth user.
- Keep browser requests same-origin using the implemented invite-validation and membership URLs, recognizable form errors, and server-derived join eligibility.
- Keep invite redemption, attempt updates, and capacity checks safe under concurrent requests.

**Non-Goals:**

- Migrate invite regeneration or other Supabase-only settings, memory, or dashboard actions.
- Copy Supabase users, invites, or rate-limit state into the Nest database.
- Reserve an invite during validation or trust the client-side code/name checks for security.

## Decisions

### Reuse the spaces module and same-origin proxy

Expose `POST /api/spaces/invite-validations` and `POST /api/spaces/memberships` through the existing Nest spaces controller and service and matching Next proxy routes. Remove the old `/api/spaces/join/validate` and `/api/spaces/join` handlers. The auth guard supplies the user ID and account name; typed DTO validation rejects invalid request shapes, while the service normalizes and validates string invite codes so malformed codes still count as failed attempts. Return the standard Nest response envelope, with `{ valid: true }` or `{ space_id }` on success. Use `proxyRequest` in the Next handlers, forwarding the cookie, status, body, and `Retry-After`. Update the join page to read the Nest envelope's error array and `field`, retaining its translated code errors and name-field focus.

Making the browser call Nest directly would introduce cross-origin cookie handling. Keeping the Supabase RPC behind the old Next routes would leave the identity and data-store split unresolved.

### Resolve join-page membership through one session

Remove `supabase.auth.getUser` from both join pages. Call the existing request-scoped `getActiveSpaceForCurrentUser`: redirect authenticated members home, redirect only its explicit authentication error to sign-in, and surface unexpected lookup failures rather than interpreting them as no membership. Keep the existing session-storage join form and home navigation after a successful redemption; the home route reads the new partner membership from Nest.

### Lock attempt state and redeem atomically

Store join-attempt counters in Redis, keyed by authenticated user, using `Ratelimit.fixedWindow(5, "10 m")`. Use the Upstash REST client in production and a local Redis REST proxy in Compose so both environments use the same client. Serialize validation and redemption per user with a short-lived Redis mutex; record a failure only after a failed domain outcome commits, so transient database failures remain uncounted. The first five failed attempts in a fixed window return their normal errors. Subsequent requests before the reset return 429 with `Retry-After` equal to the ceiling of the remaining fixed-window seconds, clamped to at least one. Rejected requests do not start a new lock or extend the reset. Successful validation preserves failures; successful redemption clears state after its database transaction commits. Redis errors fail the join request closed rather than bypassing the limit. Do not remove the legacy Supabase `rate_limits` table or its invite-regeneration RPC; migrate that feature separately.

For redemption, normalize and validate code using the shared `@leonly/utils/invite-code` prefix/alphabet contract, then lock the candidate space row and recheck expiry, deletion, active membership count, and the user's lack of an active membership **inside the same transaction**. Frontend input formatting trims surrounding whitespace before truncation, and frontend schema validation uses the same shared rules before display transformation. Keep cryptographic random generation in Nest while taking its prefixes, alphabet, and suffix length from that shared module. Insert the partner with completed onboarding and clear the invite and its expiry in the database transaction; clear Redis attempts after commit. Existing unique indexes on active user and partner role are the final race guards; translate their conflicts into the same generic unavailable outcome. Validation only reads eligibility and never reserves a slot. Normalize the optional display name using the same account-name fallback established for creation. An in-memory counter would lose state across API instances; reusing the Supabase limiter would require a second identity store.

### Keep rejection information narrow

Return a distinct 400 for malformed format and invalid supplied name (with `field: "display_name"`), but use one generic 404 for all semantically unavailable invites, including self-join and concurrent loss of the last slot. The Nest exception filter supplies the standard error envelope; set `Retry-After` on locked responses. Avoid returning space names, members, attempt counts, or invite details on validation. The join form handles both the new envelope and an unavailable response without discarding its persisted input.

## Risks / Trade-offs

- **Two stores still contain space-related records** → Use only Nest's space and membership tables for this journey; leave legacy Supabase flows outside the migrated path.
- **A capacity race after code validation** → Recheck under a space-row lock during redemption and rely on unique indexes for the final guarantee; validation never promises reservation.
- **Attempt state and membership use different stores** → Record failures only after a transaction completes; clear state only after successful redemption commits.
- **Fixed-window boundary bursts** → The allowance resets at fixed ten-minute boundaries. Five failures near the end of one window do not create a new ten-minute lock and can be followed by five more failures in the next window. This is the accepted behavior of the implemented limiter.
- **Redis outage or lock contention** → Fail closed, release per-user locks with a token-checked script, and test lock thresholds and transient database failures.
- **New envelope breaks legacy client parsing** → Update the join page and focused route tests together, including 400 field feedback and 429 retry header.

## Migration Plan

1. Configure Upstash REST credentials in production and the Redis REST proxy for local Compose; no join-attempt database migration is needed.
2. Switch Next join handlers to `proxyRequest`, update join-page guards and envelope handling, and adjust focused web tests.
3. Validate the OpenSpec change, run API/web-app checks, and manually verify Better Auth join, refresh, fixed-window rate limiting, and the two-member destination.
4. Deploy Redis configuration, then Nest endpoints, then web callers. If needed, roll back the web callers while keeping Nest routes; retain legacy Supabase rate-limit storage and RPCs for invite regeneration.
