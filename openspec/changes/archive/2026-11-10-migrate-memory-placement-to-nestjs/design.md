# Design

## Context

See [proposal.md](proposal.md) for motivation and the three delta specs for behavior.

- Timeline and Vault detail already read Prisma-backed memories through NestJS. Their shared `MemoryDetailView` has an `actions` slot, but neither detail page supplies placement controls.
- The legacy `place-memory.ts` server adapter calls Supabase `place_memory`; the Next.js placement route uses an opaque legacy version. These cannot safely mutate the memories returned by current readers.
- `MemoryDetailService` currently serializes `updatedAt` through JavaScript `Date.toISOString()`, losing PostgreSQL sub-millisecond precision. Current comment and settings mutations use `lastKnownUpdatedAt` and database-formatted timestamps.
- Current comment/reaction mutations already lock the parent memory. Prisma persists visibility and soft deletion independently; placement needs no new lifecycle state or table.

## Goals / Non-Goals

**Goals:** One current-backend placement path, exact optimistic concurrency, shared-space authorization at commit, and a small detail-only UI using existing composition and client conventions.

**Non-Goals:** Migrating edit/delete APIs, adding their buttons, copying legacy records, changing photo storage, adding realtime subscriptions, or introducing new dependencies.

## Decisions

### 1. One endpoint for both directions

Add `PATCH /api/memories/:memoryId/placement` to the memories module with strict DTO validation and shared request/result contracts. The body is `{ visibility, lastKnownUpdatedAt }`; the result is `{ id, visibility, updatedAt }` in the existing envelope. Use session identity and active membership, never submitted user/space/creator IDs. Normalize malformed path IDs to the same generic unavailable response as other unavailable targets.

This follows current API ownership and avoids separate move/restore implementations. Reusing the Supabase adapter would target a different persistence/authentication system.

### 2. Serialize eligibility and update inside one transaction

Resolve and lock the current space and membership before locking the memory, following existing membership locking conventions. Recheck availability within that transaction. Use the parent-memory lock shared with comment/reaction mutations; establish consistent space/member/memory lock ordering for affected paths before adding another lock sequence.

After locking, check memory scope, deletion, and source visibility before comparing versions: an already-at-target or otherwise unavailable record returns generic 404 even if its timestamp is stale. An eligible stale record returns 409. Update visibility and supported audit fields only, atomically comparing `updated_at` with the exact submitted timestamp. Advance `updated_at` strictly using the existing database-clock pattern, including its one-microsecond minimum increment. Return the committed timestamp directly from PostgreSQL.

An application-only precheck followed by an unconditional update would allow stale requests or revoked access to win. No automatic mutation retries are needed; the UI refreshes authoritative state after a conflict.

### 3. Use the existing timestamp as the version

Keep `MemoryDetail.updatedAt` as a string, but obtain its canonical full-precision value directly from PostgreSQL using the existing timestamp format. Read that timestamp and memory content from the same statement or consistent snapshot so an old body is never paired with a newer version. Send it unchanged as `lastKnownUpdatedAt`, with no JavaScript Date round trip, base64 encoding, or extra opaque version field.

This matches comment/settings contracts and avoids a new version column or parallel version system. Update detail schemas, examples, fixtures, and tests wherever they assume millisecond-only formatting.

### 4. Compose one contextual action into detail

Supply a small placement action through the existing `MemoryDetailView.actions` slot on both detail pages. Choose destination and translated label from the authorized memory's placement. Reuse the established button, API client, feedback, and styling conventions; preserve accessibility and responsive layout. Do not mount it on any summary/card component.

Guard submission synchronously as well as disabling the button while pending, preventing rapid repeated activation before a re-render. Submit the last observed timestamp. Do not optimistically remove the memory or change its placement. On success, use the existing refresh/invalidation mechanism for affected Timeline, Vault, dashboard, and related views, replace the route with destination detail, and preserve accessible success feedback across navigation.

On 409, announce the conflict and refresh authoritative detail before another attempt. On generic 404, refresh authorization and show the existing unavailable experience. On an unexpected/transport failure, announce retry guidance and reconcile current detail before a retry when the server outcome is unknown; never automatically replay the mutation. Handle 401 using the existing authentication flow.

### 5. Retire only the superseded placement path

After checking imports and callers, remove the legacy Next.js placement route, Supabase placement adapter, placement-only opaque result types, and tests whose behavior has moved. Keep timestamp helpers still used by edit/delete, historical Supabase migrations, and unrelated legacy routes. Reuse existing translations and placement styles where they fit.

## Risks / Trade-offs

- **Timestamp truncation or mismatched snapshots** → preserve exact strings throughout detail and mutation and verify microsecond round trips, including successive moves.
- **Deadlocks or authorization revocation races** → inspect existing lock order, use consistent ordering, and recheck membership/space and memory within the transaction.
- **Lost response after commit** → reconcile reads before retry; never automatically replay a potentially committed move.
- **Stale cached list/detail data** → cover affected-view refresh and destination routing, including browser back navigation. Partner realtime updates remain outside scope; fresh reads must reflect placement.
- **Mocked tests cannot prove PostgreSQL scheduling** → use API-owned behavior tests for lock/CAS interactions and controlled overlapping requests; do not introduce a database test suite or claim mocks prove live lock scheduling.

## Migration Plan

1. Add shared placement contracts, precision-preserving detail timestamps, the authenticated endpoint, and API-owned tests/documentation.
2. Wire the detail-only action to the current API and verify pending, success, stale, unavailable, and recoverable failure behavior in both directions.
3. Remove the superseded legacy placement path after caller checks; run affected backend gates sequentially and all web gates.
4. Deploy API support before the web consumer. No data backfill or schema migration is expected. To roll back, remove/disable the new detail action while retaining the compatible backend endpoint; do not redirect current-backend writes to Supabase.
