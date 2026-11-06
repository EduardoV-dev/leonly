## Why

Timeline and Vault lists read from NestJS, but their detail pages still use legacy Supabase data, authentication, and media. A newly created memory can therefore appear in a list yet fail to open. Migrate the detail screens to the current backend and make their first delivery explicitly read-only.

## What Changes

- Add authenticated Timeline and Vault detail reads using the active-space and visibility boundaries.
- Deliver ready gallery variants with five-minute signed storage URLs, replacing the detail specification's per-request reauthorization guarantee.
- Read related memories from the new backend and connect both server-rendered pages to the shared API contracts.
- Hide comments, reactions, edit, delete, and visibility-changing controls; do not issue requests for them from detail screens.
- Preserve private unavailable outcomes, loading and retry states, accessible gallery behavior, and contextual navigation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory-detail`: Migrate detail content, related memories, and gallery delivery; make both screens read-only.
- `api-endpoints`: Add authenticated memory detail and related-memory reads to the NestJS API.
- `memories-timeline`: Replace the legacy detail authorization lookup.
- `memory-editing`, `memory-deletion`, `memory-placement`: Suspend detail-page mutation controls and align deletion's media guarantee with signed URLs.
- `memory-comments`: Suspend the comments section on the migrated detail screens.

## Impact

- `apps/api`: Memories controller, scoped read service, storage signing, API documentation, and tests.
- `packages/utils`: shared detail contracts.
- `apps/web-app`: server-side API calls, Timeline and Vault detail composition, gallery, related cards, and tests.
- `openspec/specs/memory-detail`: signed URLs replace same-origin per-download authorization, and detail interactions are temporarily unavailable.
- Legacy-data import and migrations of comments, reactions, editing, deletion, and placement are outside this change. Existing legacy consumers retain their helpers and routes.
