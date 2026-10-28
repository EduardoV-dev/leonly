## Context

See `proposal.md` for motivation and scope. The API already uses NestJS, Prisma/PostgreSQL, Better Auth string user IDs, and UUID space/membership IDs. Existing memory creation uses Next.js handlers, Supabase upload grants, and synchronous Sharp generation. Its current recipe is JPEG/PNG/WebP input, 10 photos maximum, 5 MB per photo, a 40-million-pixel decoding limit, auto-orientation, and WebP cover/detail outputs with 1024/1600 maximum dimensions and quality 85.

This change creates new backend contracts. It does not migrate data or provide old-contract compatibility. Existing memory readers remain unchanged, so successful new creation is verified through the API and database rather than timeline rendering.

## Goals / Non-Goals

**Goals:** Keep upload progress durable before a memory exists; isolate client-writable staging from accepted originals; commit creation and events atomically; tolerate uncertain responses and duplicate delivery; run the production processing function locally.

**Non-Goals:** Reads, fallback media delivery, cleanup selection/execution, R2 lifecycle rules, an operator replay CLI, an automatic outbox publisher, edits/comments/reactions, broad authentication changes, and new file-category processors. Live R2 verification is a pre-deployment follow-up for this locally verified delivery.

## Decisions

### 1. Shared upload records, finalized-only memory records

Use `file_uploads` for all upload purposes. Initially accept only category `image` and purpose `memory_image`. Purpose selects authorization, validation, and key construction. Future categories add policies without changing the existing image request/response fields. Share actual S3 operations, not a speculative plugin framework.

Do not reuse `memory_assets` for staging: its `memory_id` and position remain required. Reject client-supplied storage keys, final paths, uploader IDs, and creator IDs as authority. Resolve space and creator from the authenticated active membership.

Proposed schema contract (all timestamps are `timestamptz`; UUIDs are server-generated; user foreign keys use the existing string identity type):

| Table | Fields and constraints |
|---|---|
| `file_uploads` | UUID `id`; uploader user FK; nullable space FK, required for memory purpose; category/purpose; original filename; declared MIME/size; nullable verified MIME/size; unique non-null staging and intended final keys; status; upload URL expiry; attachment deadline; nullable lease token/expiry; nullable consumed timestamp and failure code; created/updated timestamps |
| `memories` | UUID `id`; space FK; creator user FK and creator membership; nullable cover asset; title/description/location/date; timeline/vault visibility; nullable deletion timestamp; created/updated timestamps; non-null UUID `idempotency_key`; immutable text `creation_request_hash` |
| `memory_assets` | UUID `id`; space FK; non-null memory FK; unique non-null upload FK; asset type `image`; nonnegative smallint position; timestamps; unique `(memory_id, position)` |
| `memory_asset_objects` | UUID `id`; asset FK; original/cover/detail variant type; unique final object path; pending/processing/ready/failed status; MIME/size; nullable failure code and ready timestamp; timestamps; unique `(asset_id, variant_type)` |
| `outbox_event` | UUID `id`; text aggregate type/ID and event type; positive integer schema version default 1; JSONB payload; created timestamp; nullable published timestamp; nonnegative attempts default 0; nullable last publication error |

Add asset-level generation recipe version and nullable processing lease token/expiry to coordinate a whole-image job. Derive completion from both required variants being ready rather than a redundant completed flag. Require positive verified sizes and complete metadata for ready objects. Keep upload statuses distinct from variant statuses; proposed upload states are issued/finalizing/finalized/consumed/failed.

Use composite foreign keys/unique reference targets to enforce creator membership and attached assets belonging to the memory's space. A composite cover FK must identify an asset of that memory; insert the memory with null cover, insert assets, then set cover in the same transaction. Upload consumption is unique and cannot attach one upload to two memories. Index uploader/space eligibility, upload state/deadline, asset memory, and unpublished outbox records. Do not add cleanup jobs or speculative cleanup indexes.

Retain user-supplied memory-domain columns that serve creation; replace creation mutation identity with the agreed key/hash. Do not introduce legacy edit-mutation columns for this creation-only model. Preserve current user/space models instead of rebuilding the pasted Supabase identity schema.

Alternative: stateless signed grants avoid an upload table but cannot durably attribute final copies after a crash. The user chose durable tracking.

### 2. API boundaries and timing

`POST /api/files/uploads` accepts JSON purpose plus a batch of filename/content-type/byte-size descriptors and returns the standard API envelope containing per-file ID, PUT URL, required headers, and expiry. Persist records before returning any upload capability. The initial image batch and descriptors follow existing limits. Do not implement multipart uploads for these bounded images.

Upload URLs last exactly 600 seconds. Persist the latest expiry if issuance is renewed; renewal after finalization begins is forbidden. An already-started upload may finish after URL expiry. Attachment eligibility is independent: the attachment deadline is 70 minutes after issuance, one hour after the 10-minute upload URL expires. Timing does not schedule deletion in this change.

`POST /api/memories` accepts JSON title, optional description/location, date, timezone, visibility, ordered upload IDs, optional cover upload ID, and UUID idempotency key. Apply the established normalized text/date/cover rules and non-enumerating errors using existing API envelopes. Missing optional text normalizes to null. Preserve order, reject duplicate upload IDs, and identify cover by upload ID rather than client storage paths.

Alternative: continue multipart memory-specific grants. Rejected because it binds generic upload issuance to memory details and the former backend.

### 3. Staging-to-final promotion is first-write-wins with one provider-independent implementation

Keys have no leading slash:

```text
staging/memories/{spaceId}/{uploadId}/original
memories/{spaceId}/{uploadId}/original
memories/{spaceId}/{uploadId}/cover.webp
memories/{spaceId}/{uploadId}/detail.webp
```

Persist both keys on issuance before any copy. The ID can become the asset ID when consumed; the unique upload FK makes attribution explicit. Clients receive PUT authorization only for staging. Bucket credentials remain server-side; no public access or final-key upload grants.

Claim an eligible upload using a compare-and-set lease lasting 120 seconds. Use the same bounded staging GET followed by final PUT with `If-None-Match: *` on R2 and Floci. Only endpoint, credentials, region, and bucket configuration differ. On a destination-exists outcome, validate that final object and reuse it; never overwrite it from staging. The running Floci ignores R2's `cf-copy-destination-if-none-match` CopyObject extension, so do not add provider-specific CopyObject branches. A plain HEAD followed by unconditional COPY or PUT is not a safe substitute. See `provider-feasibility.md` for evidence and outstanding live R2 checks.

The user explicitly approved implementing sections 3 and 4 while deferring live R2 verification. The 2026-10-28 archive reconciliation closes task 1.3 for the locally verified scope. Local Floci application evidence is recorded separately; no live R2 compatibility is claimed.

Validate the final copy, not solely staging before promotion: the client can replace staging while its URL remains valid. Bound staging downloads and reject excess bytes before a final PUT. Download final bytes with a bounded size, check detected format and declared policy, decode with the existing pixel limit, and record verified metadata. Do not generate variants on the API request path. An invalid immutable final copy requires a new upload ID, not replacement of that key.

When a lease expires, a retry can reclaim finalization and validate the first accepted final copy. Lease-token checks fence stale attempts out of status updates and database consumption. No storage calls occur inside the memory transaction. Bound concurrent copies/decoding to avoid unbounded request memory.

Alternative: create-only direct uploads remove copying but were explicitly declined. Staging remains client-writable even after promotion; subsequent staging changes do not affect final originals.

### 4. Database idempotency and atomic consumption

Hash a canonical, validated JSON representation using SHA-256 with fixed field order, normalized optional text, ordered upload IDs, selected cover, date/timezone, and visibility. Do not hash signed URLs, storage responses, or the idempotency key. Authoritative user/space scope is in the unique key:

```sql
UNIQUE (space_id, created_by_user_id, idempotency_key)
```

Resolve a committed matching key before rejecting consumed uploads. Equal hash returns the existing ID/visibility; unequal hash returns 409. Authorization is checked on every retry. The hash remains immutable after later edits, and uniqueness is not filtered by soft deletion.

After promotion, one short transaction rechecks active membership, upload ownership/deadlines/claims, inserts memory/assets/object metadata, sets cover, consumes uploads, and inserts one outbox event per image. Original objects are ready; cover/detail objects are pending. A photo-free memory has no assets or generation events.

Concurrent duplicate submissions may both reach the insert, but the unique constraint is the durable authority. Roll back a losing transaction before fetching the winner and comparing its hash; do not query inside an aborted transaction. Upload claim contention returns a retryable in-progress result. Upload consumption under row locking/CAS prevents attachment to a different memory. Redis is not involved.

Alternative: Redis-only deduplication cannot atomically commit the creation result. A standalone idempotency table is unnecessary while retained memory rows hold the result; hard-delete retention is a future contract.

### 5. Versioned outbox and best-effort immediate publication

The image event is `ImageVariantsRequested`, aggregate type `memory_asset`, schema version 1. Its payload carries memory/space/asset identifiers, final original key, and generation recipe version. Event schema version describes the payload contract; recipe version describes image processing behavior. Use text aggregate IDs so generic events are not restricted to UUID aggregates. Do not foreign-key a generic outbox to memories.

After commit, await a bounded SQS send attempt using the persisted event ID and envelope. Acknowledge acceptance before updating `published_at`. Update publication attempts and sanitized error information without replacing event ID/payload. Capture outcomes per event; partial publication does not change creation success. Do not send before commit or use an unawaited task in request-scoped Lambda execution.

The standard SQS queue gives at-least-once processing after publication; strict aggregate ordering is unnecessary for immutable originals. A crash between commit and send leaves unpublished events. Acceptance followed by a bookkeeping failure can cause duplicate publication on a later attempt. Worker idempotency handles duplicates, but this delivery does not guarantee recovery of unpublished work.

The shared publishing function supports bounded event IDs/limits and selects unpublished rows. The operator CLI was removed at the user's request; no supported replay invocation ships. Operator tooling, scheduling, publisher leases, retry dates, and automatic reconciliation are deferred. Retained events provide recovery state for a future publisher, while variants can remain pending indefinitely.

Alternative: a scheduled publisher now would close the gap but was explicitly deferred by the user.

### 6. Independent image worker

Use the user-approved `apps/workers` workspace with an SQS Lambda handler and a separately callable processing function. Reuse the event contract through the existing `@leonly/utils/image-event` subpath, and compile the API-generated Prisma client and framework-independent storage primitive into the worker output. The worker does not import API bootstrap, Nest services, web `server-only`, Next.js, or Supabase.

The worker validates supported schema/recipe versions and verifies the event against authoritative persisted metadata rather than accepting its key as arbitrary storage authority. Missing/deleted/ineligible assets produce a safe no-op; malformed events are logged and fail according to the queue policy. Already-ready required variants for that recipe produce success.

Acquire an image-level processing lease lasting 300 seconds; generate deterministic outputs from the immutable original. Use the established Sharp recipe. Upload each output before recording its ready metadata. Resume incomplete variants after failure; do not mark the whole image complete merely because one variant exists. Stale workers cannot commit metadata for a superseded lease/recipe. Retries of the same deterministic recipe must not replace accepted outputs with different content.

Return partial batch failures for failed records, acknowledge successful records, and let SQS redeliver transient failures. Distinguish corrupt input/unsupported recipe from transient storage/DB failures. Record meaningful failure codes; retain failed messages in a DLQ after bounded receives. Start with a small batch size and bounded concurrency, configure visibility beyond execution/retry requirements, and package Sharp for the selected Lambda runtime/architecture. Use least-privilege queue, storage, and database access.

### 7. Local execution and creation-client integration

Configure R2 S3 region `auto` in production, endpoint/credentials/bucket overrides for local Floci, and separate SQS endpoint configuration. Enable private bucket CORS for allowed frontend origins and upload headers. Browser-signed hostnames must be reachable from the browser; do not rewrite a URL host after signing.

Floci verifies the full S3/SQS flow locally; confirm destination-create-only PUT and presigned behavior on R2 too, since S3 compatibility is not feature equivalence. Use the same promotion code for both providers. For everyday development, `pnpm workers:deploy:local` builds the existing worker Dockerfile under a fresh local image reference and applies only worker infrastructure through Terraform; Floci uses the image already on the Docker daemon without ECR publication. Persist the reference in ignored local tfvars, preserve other settings, reject API/destructive plan changes, and wait for Lambda readiness. Keep the ECR push/digest flow available for deployment verification, and production digest-pinned. Let an enabled SQS event-source mapping invoke the production handler automatically. Worker containers use the Compose network's database/storage endpoints; host clients retain browser-reachable endpoints. Persist Floci state across restarts. Verify actual image execution, generated variants, duplicate delivery, and restart recovery; Lambda emulation fidelity is not assumed. The manual queue runner is removed.

Switch only create submission plumbing to upload issuance, direct PUTs, and JSON creation. Reuse prepared upload IDs and the same key for unchanged retries; changed input receives a new key. Display success based on the committed API result. Do not add reads/fallback or claim timeline visibility. Keep UI redesign out of scope and resolve frontend-specific local instructions before modifying UI.

## Risks / Trade-offs

- [Final copy survives failed commit] → Its upload record already contains the key; retry can recover it. Cleanup is deferred, so tracking is not a promise of eventual deletion.
- [Staging and abandoned final copies accumulate] → Explicitly accepted for this slice; add no lifecycle rules or destructive cleanup. Keep upload records for later reconciliation.
- [Publication gap leaves variants pending indefinitely] → Return creation success and retain unpublished events. No operator replay CLI or automatic-delivery guarantee ships; recovery tooling is deferred.
- [Destination-copy support differs locally] → Use one bounded GET and conditional PUT implementation on both providers and verify provider behavior. Live R2 verification is deferred for sections 3 and 4 with explicit user approval. This transfers originals through the API, so measure its memory and execution budgets. Never fall back to unsafe overwrite behavior.
- [Crash leaves finalization/processing busy] → Expiring leases with token fencing support bounded recovery; monitor stale leases and pending ages.
- [API decodes several images] → Size/pixel limits, bounded concurrency, and measured Lambda memory/time budgets; do not run expensive variant generation inline.
- [New memories are absent from existing readers] → Reads are explicitly deferred; creation tests verify API/persisted state. No compatibility adapter or backfill is introduced.

## Migration Plan

1. Add additive Prisma models/constraints and deploy private R2/SQS/DLQ plus worker infrastructure. Preserve existing identity and space data.
2. Deploy the compatible worker/event contract before publishing production events.
3. Complete the deferred live R2 conditional-write/reuse, signing, and browser CORS checks before enabling production creation. Deploy API upload/promotion/creation, then switch the creation submission client. No operator replay CLI is included.
4. Verify a bounded end-to-end creation and inspect final objects, event publication, and variant readiness. No legacy data migration is run.
5. Roll back by disabling new creation traffic/publication and pausing the event-source mapping when necessary. Preserve records and objects; never drop schema/storage to roll back. Existing unpublished events remain retained for future recovery tooling, not a shipped replay command.

## Open Questions

- Worker workspace naming is approved as `apps/workers`; `worker-sizing.md` records the selected 1024 MiB/120-second Lambda, one-record batches, and concurrency 2 with local measurements and their limits.
- Live R2/browser compatibility checks must precede production enablement. Cleanup retention and execution, replay tooling, automatic publisher scheduling, and read migration belong to subsequent work, not prerequisites for archiving this locally verified delivery.
