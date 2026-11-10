# Proposal

## Why

US-008 still routes memory placement through a Supabase RPC while Timeline and Vault reads use the new backend. Migrate both placement directions to NestJS/Prisma and restore detail-only actions so either active member can move the same current-backend memory safely.

## What Changes

- Add an authenticated, version-checked placement endpoint using the current Prisma memory and session-derived active membership, with atomic authorization and lifecycle serialization.
- Show **Move to Vault** only on Timeline memory detail and **Move to Timeline** only on Vault memory detail. Do not add placement buttons to cards or other summary surfaces.
- Return precision-preserving memory timestamps and accept `lastKnownUpdatedAt`, following the existing optimistic-lock request convention.
- Prevent duplicate pending submissions, announce recoverable errors, refresh affected views, and navigate to destination detail after success.
- Replace the legacy placement request path without migrating unrelated edit/delete flows or importing Supabase records.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory-placement`: Require current-backend bidirectional placement, detail-only contextual actions, and atomic version and lifecycle checks.
- `memory-detail`: Enable contextual placement actions alongside comments and reactions while keeping edit/delete controls unavailable.
- `api-endpoints`: Define the placement endpoint and precision-preserving detail timestamps used by placement requests.

## Impact

- API: memories controllers, DTOs, services, module wiring, OpenAPI documentation, and API-owned tests.
- Shared contracts: placement request/result types and exact memory detail update timestamps under `@leonly/utils/contracts`.
- Web app: Timeline/Vault detail composition, placement action, authenticated API client usage, translations, affected-view refresh, and related tests/fixtures.
- Legacy placement: remove the superseded Next.js placement route and Supabase adapter after checking consumers; leave unrelated legacy mutations and database history intact.
- No new dependencies, tables, storage operations, or worker behavior are expected.
