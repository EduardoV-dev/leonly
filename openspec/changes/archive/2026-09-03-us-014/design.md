## Context

See `proposal.md` and `specs/memory-deletion/spec.md`. Memories already carry `deleted_at` and an
`updated_at`-backed version token; Timeline, Vault, detail, comments, reactions, counts, RLS, and Storage
policies already exclude soft-deleted parents. Placement and editing use service-role security-definer RPCs
with optimistic concurrency, while comments and reactions currently check the parent without locking it.

Photo projections currently expose five-minute Supabase signed URLs. Supabase documents that an issued
signed URL remains valid until expiry and cannot normally be revoked early, so the current delivery model
cannot provide immediate media denial after deletion.

## Goals / Non-Goals

**Goals:**
- Make soft deletion one atomic, version-conditional memory lifecycle mutation.
- Serialize parent and related writes so every overlap has a deterministic retained result.
- Reconcile all local memory projections without exposing deleted detail or related state.
- Make every browser photo request reauthorize the parent memory and prevent post-delete cache reuse.

**Non-Goals:**
- Hard deletion, user-facing restore of a soft-deleted memory, retention scheduling, or deletion audit UI.
- Realtime partner synchronization or invalidation of a partner's already-rendered page.
- Changing memory content, visibility, related records, or media during soft deletion.

## Decisions

### Use one version-conditional `delete_memory` RPC

Add a service-role-only security-definer RPC that derives the actor's available space, locks the target
memory row `FOR UPDATE`, checks `deleted_at is null`, and compares `updated_at` with the decoded expected
version. A current active target receives one deletion timestamp; an active authorized stale target returns
`conflict`; every missing, inactive, deleted, malformed, cross-space, or inaccessible target returns
`unavailable`. The route `DELETE /api/memories/:memoryId` validates a strict expected-version payload and maps
these outcomes to the established 204/409/generic-404 contract with secure structured logging.

Repeated completed requests intentionally return unavailable rather than replaying success. This matches the
non-enumerating story rule, while the client resolves an indeterminate response by re-reading availability
before deciding whether to offer retry.

Alternative considered: an unconditional `UPDATE ... WHERE deleted_at is null`. Rejected because a member
could confirm one version and silently delete content or placement changed by another member.

### Lock the parent lifecycle in every related write RPC

Replace existence-only parent checks in comment creation, comment editing/deletion, and reaction toggling
with an explicit lock and post-lock `deleted_at is null` check on the memory row. Use a consistent lock order:
available membership, parent memory, then comment or reaction row. Memory edit, placement, and deletion
already lock or update the parent and remain version-conditional.

If a related mutation obtains and commits the parent lock first, it can succeed; deletion then retains but
hides that result. If deletion commits first, the waiting related mutation observes the deleted parent and
returns unavailable without writing. If another memory-level mutation commits first, deletion sees the new
version and returns conflict; if deletion commits first, the other mutation sees unavailable.

Alternative considered: leave child writes as snapshot existence checks. Rejected because a comment or
reaction could pass authorization, wait behind deletion elsewhere, and become persisted after deletion.

### Serve photos through a reauthorizing same-origin media route

Replace projected signed URLs with opaque URLs containing only memory ID, photo ID, and an allowlisted
variant. A same-origin route authenticates the request, resolves the active parent and matching photo through
server-owned metadata, downloads the object with the server client, and streams bytes without redirecting or
returning the object path. Responses use a fixed image content type, `Cache-Control: private, no-store`,
`X-Content-Type-Options: nosniff`, and the same generic unavailable response for every denied target.

Timeline and Vault request the cover variant; detail and editing request the detail variant. The browser must
load this route directly rather than through an image optimizer or cache that could outlive authorization.
Direct authenticated Storage requests remain protected by the existing RLS policy, while the browser no
longer receives irrevocable signed credentials.

Alternative considered: reduce signed URL TTL. Rejected because any positive TTL leaves a period after
successful deletion in which retained media remains readable.

### Keep deletion owned by direct memory detail

Inject one feature-owned deletion action only into the shared action composition used by Timeline and Vault
detail views. Do not add the action or deletion-specific data to Timeline, Vault, dashboard, recent-memory, or
related-memory cards. The detail already provides memory identity, version, and visibility; the action owns
confirmation, pending, conflict, failure, and focus restoration while authorization remains server-side.

On confirmed success, invalidate the complete memory query family and navigate to the prior visibility's
collection route, which reloads from page one and publishes one localized success toast. Conflict refreshes
the current detail before a new attempt. Unavailable clears stale projections and follows the success
destination only when reconciling an indeterminate request; otherwise it uses the existing generic not-found
boundary.

Alternative considered: also exposing Delete on summary cards. Rejected because destructive deletion deserves
the complete memory context and deliberate confirmation available on the detail view.

## Risks / Trade-offs

- [The media proxy increases application bandwidth and removes optimizer caching] -> Use existing cover/detail
  variants, stream bounded objects, and prefer immediate revocation over caching for private MVP media.
- [Old signed URLs issued before deployment remain valid for up to five minutes] -> Deploy reauthorizing media
  reads first, wait at least the previous maximum TTL, then enable the delete route and controls.
- [Parent locking increases write contention] -> Locks are per memory, transactions are short, and every RPC
  follows one lock order to avoid deadlocks.
- [A deletion can invalidate a loaded pagination cursor] -> Invalidate all memory projections and reload the
  destination collection from its first page.
- [A network loss makes mutation outcome uncertain] -> Reauthorize the memory before showing retry; absence
  confirms deletion without turning repeated DELETE into an enumerating success response.
- [Browser or intermediary caching could expose old bytes] -> Use direct same-origin media URLs, no redirects,
  `private, no-store`, and tests asserting headers and denial after deletion.

## Migration Plan

1. Add the media route and switch Timeline, Vault, detail, and editing projections away from signed URLs.
2. Deploy that read-path change and wait at least five minutes so all previously issued signed URLs expire.
3. Add parent locking to related mutation RPCs, then add the atomic deletion RPC, server module, and route.
4. Enable the detail-only confirmation control, reconciliation, localization, and tests.
5. Roll back controls and the deletion route first. The media proxy and stronger mutation locking are safe to
   retain; already soft-deleted records remain governed by the existing lifecycle and require no reversal.
