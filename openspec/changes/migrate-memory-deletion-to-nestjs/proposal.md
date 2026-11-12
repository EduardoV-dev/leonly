# Proposal

## Why

US-014's web flow still deletes through Supabase, and its confirmation controls are unmounted from detail screens. The initial NestJS implementation marks only the memory. The revised contract requires a bodyless deletion of current state with an atomic cascade and shared parent-memory locking across related mutations.

## What Changes

- Revise `DELETE /api/memories/:memoryId` to require no body or version token. Lock membership and the memory, recheck authorization, and delete current state without a stale-version conflict. Success retains the shared envelope with `data: null`.
- In one transaction, soft-delete all comments and reactions, mark attached files and derivatives `deleting`, and mark the memory deleted last. Retain rows and objects pending separate physical cleanup.
- Coordinate comment creation, replies, editing, removal, and reaction writes through the parent-memory lock; reject writes that resume after deletion with generic unavailable.
- Restore a Delete action with confirmation on Timeline and Vault detail only. Summary cards keep no Delete control, and Edit stays unavailable.
- Accept the existing five-minute signed-URL window. After deletion succeeds, no reader issues new signed media URLs, and already issued URLs may remain usable until their own expiry.
- Replace the Supabase delete RPC, its Next.js route, and the memory-deletion helpers with the NestJS client path.
- Retire the legacy Supabase resource-cleanup runtime and its scheduled trigger, per the earlier decision that no legacy Supabase files will exist.
- Keep physical storage cleanup for abandoned uploads and superseded sources deferred to `implement-file-cleanup`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory-deletion`: Bodyless current-state deletion, ordered cascade, shared mutation locking, detail-only confirmation, and accepted signed-URL expiry.
- `memory-detail`: Allow Delete alongside the existing reactions, comments, and placement controls on Timeline and Vault detail, while Edit stays unavailable.
- `api-endpoints`: Document bodyless memory deletion with null success data and no stale-version 409; preserve optimistic-lock fields for other operations.
- `file-upload-lifecycle`: Mark attached originals and derivatives `deleting` without physical removal or worker revival.

## Impact

- API: memories controller, deletion transaction, comment and reaction coordination, read filters, OpenAPI documentation, and API-owned tests. Remove deletion's `OptimisticLockDto` dependency only.
- Web app: deletion hook, confirmation component, detail action composition, translations, cache refresh, the legacy `[memoryId]` route, the Supabase delete helper, and their tests.
- Legacy cleanup: `vercel.json` cron, the `/api/internal/resource-cleanup` route, `resource-cleanup.ts`, and their call sites in creation and edit upload routes.
- Add a nullable reaction deletion timestamp through the shared Prisma schema and migration; update reaction reads and writes to exclude tombstoned rows. Keep Supabase migration history intact.
- Deleting a memory does not enqueue storage removal, so retained media stays private and attributable.
