# Design

## Context

See `proposal.md` for motivation and scope. The current list hooks call Next.js handlers, whose
server readers query Supabase and enrich each item with a cover, comment count, and reaction RPC.
The active-space lookup already uses NestJS, but the list readers still check Supabase Auth too.

NestJS already provides Better Auth session resolution, a global auth guard, Prisma, standard JSON
response wrapping, storage integration, and a Memories module that creates records. The database
owns `Memory`, `MemoryFile`, and `File` models, including ready/failed asynchronous image variants.
It has no comment or reaction models. PostgreSQL stores creation timestamps at microsecond precision.

The existing list specs require private same-origin image delivery and stale-cursor resets. This
change replaces list-image delivery with five-minute signed storage URLs, removes list card reactions,
and rejects malformed cursors. Existing detail routes still use the legacy backend. Its image route
also serves edit previews and related-memory covers, so that route remains until those consumers
are migrated separately.

## Goals / Non-Goals

**Goals:**
- Use one backend authorization and persistence boundary for new memory creation and list reads.
- Share listing, precision-safe pagination, and summary contracts between Timeline and Vault.
- Authorize ready-cover URL issuance inside each list read and keep storage private.
- Make the frontend cutover remove list-path Supabase dependencies, including social enrichment.

**Non-Goals:**
- Legacy-data import, dual reads, backfill, or Supabase fallback.
- Comment/reaction persistence, reads, or mutations; detail pages and other memory mutations.
- Offset pagination, totals, backward traversal, realtime updates, or UI redesign.
- A replacement NestJS image endpoint, Next.js image proxy, or removal of the legacy image route
  still required by out-of-scope consumers.
- Expiry-driven URL renewal, image-error refetches, React Query freshness/focus changes, or new browser
  cache policies. Address these separately only if they become a demonstrated problem.

## Decisions

### 1. Extend the existing Memories module with one shared read path

Expose `GET /api/memories/timeline` and `GET /api/memories/vault` through thin methods in the existing
controller. Delegate listing to a dedicated read service in the module's existing `services/` folder
so creation logic stays focused. The route supplies a fixed visibility; callers cannot choose an
arbitrary user or space. Request DTOs use the project's validation and transformation pipeline.

Use `request.authUser.id` from the global Better Auth guard. Resolve an undeleted membership in an
undeleted space and constrain list/anchor reads and cover metadata to that authorized scope. Include current
membership/space availability in data-read predicates rather than relying on a browser-provided
space or a stale frontend lookup. No membership returns generic 404; no session returns 401.

Alternative: separate Timeline and Vault modules/services with duplicated queries. Rejected because
the only list eligibility difference is visibility. Keeping reads in Next.js would retain split auth
and would not migrate persistence ownership.

### 2. Use the shared API envelope and a summary-only page contract

Export one summary and page contract through `@leonly/utils/contracts`, reused by API and web app:

```text
ApiResponse<{
  data: MemoryListItem[];
  meta: { nextCursor: string | null; cursorReset: boolean };
}>

MemoryListItem:
  id, title, memoryDate, createdAt,
  description: string | null, location: string | null, coverPhotoUrl: string | null
```

Reuse the existing response interceptor; do not double-wrap service results. `coverPhotoUrl` is a
nullable signed storage URL inside the ordinary JSON item, not embedded image bytes. Keep
`memoryDate` date-only. Omit social fields entirely, and
update card composition so omitted fields never trigger placeholder zeros or legacy requests.
Do not weaken detail-specific types or delete social code still used outside these lists.

Alternative: retain the old `memories/nextCursor` shape inside an API-specific envelope. Rejected in
favor of the standard cursor-page layout; update the two hooks and reset consumers together.

### 3. Retain cursor pagination with exact database timestamps

Both endpoints default to newest-first; oldest-first reverses every tuple field and comparison.
Both endpoints accept `limit` 1–20 (default 10), including the dashboard's current limit of four.
Fetch `pageSize + 1`, trim before mapping or loading covers, and encode the last
returned item only when lookahead proves another page exists.

Use schema-aware shared cursor encode/decode utilities with a strict Zod schema containing
`memoryDate`, `createdAt`, `id`, and `sort`. Bound cursor input to 2,048 characters and reject
invalid Base64URL, JSON, fields, dates, or sorts with HTTP 400. Treat invalid server-generated
payloads and unexpected utility failures as internal errors, not client errors. Well-formed stale
anchors, cross-list anchors, and sort mismatches return page one with `cursorReset: true`; otherwise
the flag is false. Validate anchors under the same authorized visibility and exact full tuple.

Prisma's JavaScript `Date` values cannot retain PostgreSQL microseconds. Use parameterized Prisma raw
SQL for the precision-sensitive ordered page and anchor reads, projecting UTC creation timestamps as
strings directly in PostgreSQL and comparing the decoded strings as `timestamptz`. Bind every cursor
value; choose order direction from fixed server-side branches, never caller SQL. Use Prisma relations
for batched cover metadata after the page is selected. Do not change timestamp column precision or
round existing records to make cursors work.

Add a SQL migration in `packages/database/prisma/migrations/` for an index on
`(space_id, visibility, memory_date, created_at, id) WHERE deleted_at IS NULL`. The same B-tree can
support either complete ordering direction; no duplicate ascending/descending index is needed.

Alternative: a plain Prisma query with `Date.toISOString()` in cursors. Rejected because truncating
microseconds can break equality and continuation. Offset pagination changes existing navigation and
is unnecessary for these sequential feeds.

### 4. Issue five-minute signed storage URLs in list responses

Resolve the selected cover through `Memory.coverFileId`, its `MemoryFile` attachment, the original
`File`, and the ready `cover` variant in the same space. Batch metadata for the selected page rather
than adding per-item database queries. A missing cover or non-ready variant yields `coverPhotoUrl:
null` without excluding the memory. Do not select arbitrary originals as a processing fallback.

Extend the existing framework-agnostic storage integration with GET URL signing using the installed
S3 SDK and configured client. The list read signs only authorized ready-cover object keys for
300 seconds from issuance, never arbitrary caller-supplied paths. Reuse the configured storage client
and bucket; keep buckets private and do not expose reusable signing credentials or separate object-key
metadata. Signing failure is an internal list failure with safe diagnostics, not a fabricated URL.

Return each signed URL directly as `coverPhotoUrl`. Every actual authorized backend list read signs
its ready cover URLs anew. The browser renders the URL directly from storage without an application
cover endpoint, a redirect, or a Next.js image proxy. Do not add the previously proposed
`GET /api/memories/:memoryId/cover` operation. Signing credential expiry can shorten the five-minute
window. A download started before expiry may complete; expiry does not erase downloaded images.

This intentionally changes the migrated list-image privacy contract: authorization occurs when a URL
is issued, and anyone holding it can request that object until effective expiry even after membership
revocation. Later list requests must still enforce current authorization. It does not change the
legacy media contract for detail, edit-preview, or related-memory consumers.

Keep the existing legacy `GET /api/memories/:memoryId/photos/:photoId/:variant` route, its authorization,
and the helpers/tests used by those out-of-scope consumers. Remove only migrated list dependencies
on it. Its global removal belongs to the future migrations and it will not be ported to NestJS here.

Alternative: an authenticated backend image endpoint plus a same-origin proxy. Rejected by the user
because list responses should provide direct signed cover URLs instead of another application image
endpoint. The accepted trade-off is bounded bearer-URL access rather than per-download authorization.

### 5. Cut over the existing list consumers together

Replace raw relative list `fetch` calls with the existing credentialed Axios API client. Add small
feature API functions for Timeline and Vault, unwrap the shared envelope, and keep query keys, sort
changes, pagination, existing retry states, and reset behavior aligned with the new page contract.
Preserve existing React Query cache/refetch settings; do not add expiry timers or image-error renewal.
The dashboard continues to use the Timeline hook's recent variant. Remove list-only comment/reaction rendering,
imports, and fixtures without changing legacy detail interactions or unrelated shared UI behavior.

Delete Next.js Timeline/Vault list handlers, their obsolete tests, and the Supabase list readers once
all callers and cursor exports have been migrated. Keep the legacy photo route and helpers that still
have out-of-scope callers. Existing UUID detail links remain; do not
fake successful detail reads or broaden this change into a detail migration.

Alternative: leave the old list routes as proxies. Rejected because the frontend already has a
credentialed API client and another list layer adds no authorization or compatibility value.

## Risks / Trade-offs

- New-backend detail support is absent → retain existing links and record that opening a listed new
  memory can reach the legacy generic not-found page. Successful new-backend detail navigation is
  not an acceptance claim of this change and requires its own migration.
- Processing may finish after a null cover was cached → keep existing list refresh/navigation behavior
  and verify that a refreshed list gains the ready cover; do not add polling or realtime scope.
- Active membership may change after URL issuance → scope the database read itself, deny subsequent
  unauthorized list requests, and accept that issued URLs can remain usable for up to their effective
  five-minute lifetime. Do not claim per-download revocation for signed covers.
- Cached lists may retain expired signed URLs → accept this known limitation for now. No new browser
  caching, React Query policy, automatic renewal, or recovery mechanism is part of this change.
- Raw SQL can drift from generated types → keep it narrow, parameterized, explicitly mapped, and
  test SQL boundary inputs and microsecond round trips in the API-owned suite with mocked boundaries.
- Legacy actions still exist in shared components → inspect actual callers and remove only list-owned
  social controls; exercise detail regressions when shared components/types change.

## Migration Plan

1. Add the index migration, shared contracts/cursors, signed-GET storage support, and API list endpoints with focused
   API-owned tests. Apply migrations using the existing application database configuration.
2. Deploy backend support before the new frontend. Document endpoints and confirm local integration
   with records created through the NestJS creation path and worker-generated ready covers.
3. Deploy the web consumer cutover with direct signed covers, remove obsolete list paths, and run
   backend gates sequentially plus the required web checks. Verify Timeline, Vault, recent memories,
   pending/ready covers, signed-URL lifetime, list authorization after revocation, and reset/validation
   states. Confirm that legacy detail/edit/related-memory image delivery still works through its route.
4. If rollback is necessary, roll back the frontend and read-endpoint deployment together as needed;
   the additive feed index can remain. The old frontend only restores its legacy Supabase view and
   cannot display new-backend records. No destructive schema rollback or data deletion is required.
