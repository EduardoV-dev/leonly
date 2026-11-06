# Proposal

## Why

Timeline, Vault, and dashboard recent-memory reads still depend on Supabase while memory creation,
authentication, and file processing have moved to NestJS. Read the new backend's records through the
same authenticated boundary so newly created memories can appear in these lists.

## What Changes

- Add authenticated NestJS Timeline and Vault list endpoints using Prisma and active-space membership.
  Read only records created through the new backend; do not import or fall back to Supabase data.
- Preserve newest/oldest cursor pagination, 20-item bounds, dashboard recent-memory limits, and stale
  anchor resets. **BREAKING:** malformed cursors return HTTP 400 instead of a first-page reset.
- Resolve ready covers through `MemoryFile` and `File` and return direct storage GET URLs signed for
  five minutes in list responses. **BREAKING:** migrated lists authorize image access when issuing
  the URL rather than on every image request; issued URLs remain usable until expiry.
- Stop Timeline, Vault, and dashboard recent memories from using the legacy image endpoint. Do not
  add a NestJS image endpoint or a Next.js image proxy. Keep the legacy route for detail pages, edit
  previews, and related-memory covers until those consumers are migrated separately.
- Switch list consumers to the existing credentialed API client and shared response envelope.
  **BREAKING:** list payloads and cards omit comment counts and reaction summaries/controls.
- Remove obsolete Next.js list handlers and Supabase list readers after migrating their callers.
  Memory-detail pages and mutations remain outside this change; existing UUID detail links remain,
  with their new-backend compatibility documented as a separate delivery limitation.

## Capabilities

### New Capabilities

None. Extend the existing list and API capabilities.

### Modified Capabilities

- `api-endpoints`: Specify authenticated Timeline/Vault GET contracts, five-minute signed cover
  URLs, and continued legacy image delivery only for out-of-scope consumers.
- `memories-timeline`: Read new-backend data, support both sort directions, reject malformed cursors,
  return five-minute signed covers, and remove card reaction controls and comment metadata.
- `private-vault`: Apply the equivalent new-backend list, pagination, cover, and metadata boundaries
  while retaining shared access for both active members.
- `shared-space-dashboard`: Source recent memories from the NestJS Timeline endpoint with a smaller
  limit and without comments or reactions.

## Impact

- API: `apps/api/src/modules/memories/`, existing authentication, Prisma, and storage integrations;
  query DTOs, OpenAPI documentation, list/cover tests, and shared cursor utilities.
- Database: `packages/database/prisma/` gains a partial feed index; existing `Memory`, `MemoryFile`,
  and `File` models supply list and cover data. No comment/reaction models or legacy-data import.
- Frontend: memory list hooks, card composition, response types, direct signed-image rendering, and
  affected tests in `apps/web-app/`; existing layout, loading, empty, and retry states stay intact.
- Shared contracts: reuse `ApiResponse` from `@leonly/utils/contracts` and define one list/page
  contract shared by producers and consumers. No new dependency is expected.
- Deployment: backend and index first, then frontend cutover. Legacy detail reads, edits, placement,
  deletion, comments, and reactions are separate migrations and are not a fallback for these lists.
- Expired-URL recovery, browser-cache policies, and React Query freshness/refetch changes are deferred
  until a demonstrated problem warrants a separate change.
