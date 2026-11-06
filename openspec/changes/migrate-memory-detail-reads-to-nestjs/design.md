## Context

The two server-rendered detail routes share a Supabase-backed reader, but NestJS-created memories use Prisma `Memory`, `MemoryFile`, and `File`. The list API already scopes reads to active memberships and signs ready storage variants for 300 seconds. The current detail screen also mounts legacy reactions, comments, and mutation controls; the new schema does not provide those features. The existing list change explicitly excluded detail and legacy import.

## Goals / Non-Goals

**Goals:**
- Read detail, related items, and image metadata exclusively from the new backend.
- Preserve visibility-specific routes, generic unavailable behavior, current creator attribution, accessible gallery and retry states.
- Hide unsupported controls by not mounting them or issuing their requests.
- Deliver authorized, ready image variants using direct five-minute signed URLs.

**Non-Goals:**
- Import or dual-read legacy memories; migrate edit, delete, placement, comments, or reactions.
- Remove legacy routes or helpers still used by other consumers.
- Implement image proxying, URL renewal timers, realtime updates, or a redesign.

## Decisions

### Scoped detail and related reads

Add `GET /api/memories/timeline/:memoryId` and `GET /api/memories/vault/:memoryId` to the existing controller, using a shared detail service. Return related summaries in the detail response so the parent and recommendations share one authorization boundary. Apply active membership and undeleted space predicates to all reads, constrain fixed route visibility, and never trust caller-supplied user or space. Invalid UUIDs and all unavailable memory cases return the same generic 404; unauthenticated requests return 401. Unexpected failures remain errors, not false not-found or empty successes.

Return the standard `ApiResponse<MemoryDetail>` envelope, with a shared contract in `@leonly/utils/contracts`. Include id, title, date-only memory date, nullable description/location, visibility, timestamps, creator's current display name and nullable avatar, photos, and bounded related summaries. Omit version and social fields: no current read-only consumer needs them. Related items exclude the parent, use the same active space and visibility, sort by memory date, creation time, then ID descending, and use the existing related-card limit. Related results omit social counts rather than fabricate zeros. Confirm the authorized parent before loading related items.

### Media and availability

Read ordered attachments through `MemoryFile` and ready `cover` and `detail` `File` variants in the same space. Return every attached photo in persisted order, with the selected cover first. Each variant URL is independently nullable when missing or not ready; use the existing storage signer for authorized object keys only and never expose raw keys or reusable credentials. Preserve the gallery's detail-to-cover fallback, then its accessible unavailable fallback. No photos remains a valid empty gallery.

Direct signed URLs intentionally replace the detail spec's same-origin per-download authorization. URLs are bearer capabilities for up to 300 seconds, potentially less if credentials expire. Revocation or deletion prevents fresh issuance but cannot revoke an already issued URL before its effective expiry. A refresh obtains newly authorized URLs; expired images may need a refresh. Sign related cover URLs on the same terms. Do not claim immediate post-deletion revocation.

### Server-rendered frontend

Use the existing server-only API client with an explicitly forwarded incoming session cookie; `withCredentials` alone does not forward server-side cookies. Keep request-scoped caching across metadata and page rendering. Map API 404 to the existing generic not-found presentation, distinguish unauthenticated behavior according to the existing route auth flow, and surface 5xx/network failures through the retryable error path. Avoid shared caches for private responses. Both page components must not mount comments, reactions, or mutation controls or perform their fetches. Preserve gallery controls, related links, and context-specific back navigation.

Keep the legacy availability `GET /api/memories/:memoryId` and image routes where existing non-migrated consumers still depend on them; they are different from the new NestJS routes. No compatibility claim is made for legacy-only records.

## Risks / Trade-offs

- Signed URLs remain accessible until expiry after authorization changes; this is an explicit change to the previous media guarantee.
- Old Supabase-only memories and legacy-only actions are not migrated; avoid linking new records to unsupported features.
- Signed URLs can expire while a page stays open; reload obtains fresh URLs after authorization.
- A missing creator membership, photo variant, or storage signing failure must not expose internals or fabricate data; distinguish the expected missing-variant fallback from unexpected backend errors.
- Related reads must repeat authorization constraints and never return data if the parent is unavailable.

## Migration Plan

1. Add shared contracts and authenticated NestJS detail/read mapping and tests; reuse existing signing and deployment configuration.
2. Deploy the API before the frontend. Switch both detail pages and related cards together, without mounting legacy interactions.
3. Update affected specifications and run backend gates sequentially plus web gates. Verify newly created Timeline and Vault memories, missing variants, wrong visibility, and revoked access.
4. If rollback is needed, revert the frontend and API deployment as a compatible pair. The old frontend reads only legacy Supabase records and cannot show new-backend memories.

## Open Questions

None for this scope. Future migrations decide how to restore detail interactions and migrate legacy data.
