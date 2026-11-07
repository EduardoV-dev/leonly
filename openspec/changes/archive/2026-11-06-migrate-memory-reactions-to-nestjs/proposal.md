# Proposal

## Why

Memory detail reads have moved to NestJS, but reaction operations still depend on Supabase and the migrated detail screens omit the reaction control. Move reactions into the current backend so members can see accurate counts and react to Timeline and shared Private Vault memories through one authenticated system.

## What Changes

- Add new-backend reaction persistence with four supported types, one reaction per member per memory, and explicit `reacted_by_member_id` ownership.
- Add authenticated NestJS summary and toggle endpoints, returning authoritative counts, the caller's selection, and member names through shared contracts.
- Include reaction summaries in memory detail responses and restore the existing accessible reaction control on Timeline and Vault details.
- Replace frontend Supabase reaction requests with the configured NestJS API client, preserving optimistic feedback, rollback, and reconciliation.
- **BREAKING**: Retire the frontend's legacy Next.js/Supabase reaction endpoint and response shape once its callers are migrated. New-backend reactions start empty; existing Supabase reactions are not imported.

## Capabilities

### New Capabilities

None. Extend the existing reaction, memory-detail, and API capabilities.

### Modified Capabilities

- `memory-reactions`: Define current-backend persistence, summary composition, authenticated ownership, atomic toggle behavior, and authoritative frontend reconciliation.
- `memory-detail`: Enable reactions on both detail screens while keeping other unsupported mutations and comments disabled.
- `api-endpoints`: Define reaction read/toggle routes and extend the shared detail response with a reaction summary.

## Impact

- `packages/database`: Prisma model, reaction enum, relational constraints, and forward migration; no legacy-data backfill.
- `packages/utils/src/contracts`: Shared reaction types and the extended memory detail contract.
- `apps/api/src/modules/memories`: Reaction controller/service wiring, detail composition, validation, OpenAPI documentation, and application-owned tests.
- `apps/web-app/src/features/memories`: API calls, reaction hook/control, detail-page composition, fixtures, and tests; remove superseded reaction-only server paths.
- Deploy the database migration before the dependent API and frontend. Preserve historical Supabase migrations. No new dependency, realtime feature, list-card reaction counts, or migration of other memory mutations is required.
