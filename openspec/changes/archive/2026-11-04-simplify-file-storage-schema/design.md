# Design

## Context

See [proposal.md](proposal.md) for motivation and capability scope. At baseline `ae35261b1c020b05ccd9ec0e38f9aafe34ebde2a`, Prisma owns the schema in `packages/database`; API creation coordinates upload finalization and outbox insertion, while workers generate cover/detail images. Existing specs require staged promotion, consumed uploads, and recipe versions. This change explicitly replaces those requirements. All existing memory read paths remain unchanged and are migrated separately.

The user permits affected file tables to start empty. This is not permission to reset users, spaces, memory business records, unrelated events, or an entire database. Existing memory soft-deletion retention remains authoritative.

## Goals / Non-Goals

**Goals:**
- One row per original or derivative, with optional named variants and immutable storage identity.
- A minimal association with PostgreSQL-enforced space isolation and cover membership.
- Retry-safe verification and generation without processing/expired statuses, preserving attribution for future cleanup.
- A complete forward-migration and coordinated producer/consumer rollout plan.

**Non-Goals:**
- Implementing a cleanup worker, automated object deletion, or cleanup-specific Terraform; deferred for separate, step-by-step learning.
- Supporting multiple transformation recipes simultaneously or automatically regenerating historical variants.
- Changing storage provider, upload strategy to presigned POST, image limits, or visual design.
- Changing memory retention or shipping unrelated API endpoints or automatic outbox reconciliation.
- Migrating single-memory, photo, timeline, Vault, or related-memory readers; that work belongs in a separate change.

## Decisions

### 1. Centralize objects in `files`

Use Prisma camelCase properties mapped to these PostgreSQL columns. IDs retain the repository's UUIDv7 database default. User IDs remain text. Timestamps use `TIMESTAMPTZ(6)`; `updated_at` is maintained through the owning write paths/Prisma, not assumed to be a PostgreSQL automatic-update feature.

| Column | Type | Null/default |
|---|---|---|
| `id` | UUID | PK; `private.uuid_v7()` |
| `space_id` | UUID | Required |
| `uploaded_by_user_id` | TEXT | Required |
| `original_file_id` | UUID | Nullable |
| `variant_name` | TEXT | Nullable |
| `object_key` | TEXT | Required |
| `original_filename` | TEXT | Nullable; required for originals |
| `mime_type` | TEXT | Required |
| `size_bytes` | BIGINT | Nullable; required for originals and ready files |
| `purpose` | `file_purpose` | Required; initially `memory_image` |
| `status` | `file_status` | Required; default `pending` |
| `operation_lock_token` | UUID | Nullable |
| `operation_lock_expires_at` | TIMESTAMPTZ(6) | Nullable |
| `last_error_code` | TEXT | Nullable |
| `created_at` | TIMESTAMPTZ(6) | Required; default now |
| `updated_at` | TIMESTAMPTZ(6) | Required; default now |

Database constraints:
- PK `id`; unique `(id, space_id)`, `object_key`, and `(original_file_id, variant_name)`.
- Restrictive FKs from `space_id` to `spaces.id`, from `uploaded_by_user_id` to `user.id`, and from `(original_file_id, space_id)` to `files(id, space_id)`.
- Original ID and variant name are both null or both populated; no self-reference; populated variant names are nonblank.
- Originals require a filename and positive size; all populated sizes are positive; ready files require a size. Lock token and expiry are both null or both populated.
- Indexes `(status, created_at)` and `(space_id, uploaded_by_user_id)`.

The service additionally checks that derivatives reference a root original, inherit attribution/purpose, and use supported variant names for the requested operation. Ordinary FKs do not enforce root-only references. Lock the root when creating derivative rows to preserve operation ownership and future cleanup coordination. `variant_name` remains text, not an enum: extending supported outputs needs no database migration. Absence of a variant is valid.

Do not persist a bucket on file rows. Reads, signing, verification, generation, and deletion use the application's configured `STORAGE_BUCKET` and the authoritative per-row object key. Do not introduce an approved-buckets environment variable or per-operation bucket overrides. No client-selected bucket or key is trusted; object keys are unique.

Store accepted upload MIME type/size once and reject mismatches during content verification rather than persisting duplicate declared/verified metadata. Generated sizes start null and become known after generation. Explicitly convert bounded BIGINT values at API boundaries; do not serialize raw JavaScript bigint values into JSON or silently lose precision.

There is no persisted category, staging key, final key, upload expiry, attachment expiry, recipe version, completion timestamp, or deletion timestamp. One maintained generation recipe preserves today's image transformations. Completed/ready timing cannot be reconstructed from `updated_at`.

### 2. Keep `memory_files` to four columns

| Column | Type | Null/default |
|---|---|---|
| `memory_id` | UUID | Required |
| `file_id` | UUID | Required |
| `space_id` | UUID | Required |
| `position` | SMALLINT | Required; zero-based |

Constraints:
- PK `(memory_id, file_id)`; unique `file_id`; unique `(memory_id, position)`; check `position >= 0`.
- Restrictive composite FKs `(memory_id, space_id) -> memories(id, space_id)` and `(file_id, space_id) -> files(id, space_id)`.
- Keep the existing `memories(id, space_id)` unique key. No separate attachment ID or timestamps.

The service permits uploaded or ready root originals on new attachments and coordinates that decision with file locks/deletion state. Generic API FilesService confirms presence with HEAD without downloading or validating content. Unique attachment identity replaces consumed state. Ten minutes governs upload authorization; abandonment cleanup remains deferred.

Replace `memories.cover_asset_id` with nullable `cover_file_id`; add `(id, cover_file_id) -> memory_files(memory_id, file_id)` with restrictive/no-action behavior. Create a memory with a null cover, insert attachments, then select the cover in the same transaction. Clear/change the cover before detaching its file. Preserve all other memory fields and creation idempotency keys/hashes.

### 3. Use five lifecycle states and separate operation ownership

| State | Meaning |
|---|---|
| `pending` | Object arrival not confirmed; also initial state for planned derivatives |
| `uploaded` | Backend confirmed object presence; required validation incomplete |
| `ready` | Required content verification and output verification succeeded; image originals point to their WebP replacement |
| `failed` | Permanent backend/worker failure or automatic retries exhausted |
| `deleting` | Durable removal intent; no new use or generation allowed |

Normal flow is `pending -> uploaded -> ready`; validated derivatives can transition directly to ready. Presence checks alone never establish content safety. A ready original remains ready while derivatives are pending or fail. Leases are not statuses.

Use the Prisma-generated `FileStatus` and `FilePurpose` constant objects from `@leonly/database/client` for persisted values, comparisons, and upload-purpose validation. Do not duplicate those maps in application code.

Transient failures retain the recoverable state and record an error. Expiration, cancellation, and abandonment are not failures. Explicit retry of a retryable failed operation clears its error and returns to the appropriate pending/uploaded stage without overwriting an accepted object; invalid original bytes require a new upload identity. Deleting is terminal except for physical removal: retries never revive it.

Atomic operation claims use `operation_lock_token` and `operation_lock_expires_at`. Mutations validate current ownership, expiry, and non-deleting state. A stale execution cannot publish ready metadata. Storage side effects also need coordination: a lease cannot fence an already-issued storage write. Bound operation durations and recheck root eligibility before writes. Future cleanup must wait for active operations and reconcile late objects before deleting records; its implementation must test expired-owner/in-flight-write races rather than assuming lease expiry cancels requests.

### 4. Derive upload deadlines; defer cleanup execution

Use the existing `UPLOAD_URL_SECONDS = 600`. Set original creation time from one server-owned issuance instant and use the same instant when signing. URL authorization ends at `created_at + 600 seconds`; signing later must not renew the lifetime. Derivative creation times do not establish browser-upload deadlines.

Cleanup execution and its Terraform resources are outside this change. Abandoned uploads, superseded sources, and pre-swap WebP candidates remain stored. Preserve file attribution, operation locks, and deleting-state guards; no age-based or scheduled deletion runs.

When cleanup is implemented separately, select unreferenced originals only after upload authorization plus an explicit grace period, excluding retained memory references and active work. Serialize deletion intent with attachment and generation on the root-file boundary. A deleting root already prevents attachment and new derivatives. References from soft-deleted memories remain protected by the existing retention policy.

Future cleanup must delete objects before removing attribution, tolerate missing objects and partial failure, and account for in-flight writes and reusable upload capabilities. Restrictive FKs remain in place. These are future safety constraints, not implemented cleanup behavior.

### 5. Simplify outbox persistence without losing delivery guarantees

| Column | Type | Null/default |
|---|---|---|
| `id` | UUID | PK; `private.uuid_v7()` |
| `entity_type` | TEXT | Required; renamed from `aggregate_type` |
| `entity_id` | TEXT | Required; renamed from `aggregate_id` |
| `event_type` | TEXT | Required |
| `payload` | JSONB | Required |
| `created_at` | TIMESTAMPTZ(6) | Required; default now |
| `published_at` | TIMESTAMPTZ(6) | Nullable |
| `publish_attempt_count` | INTEGER | Required; default 0 |
| `last_publish_error_code` | TEXT | Nullable |

Keep the table named `outbox_event`; remove `schema_version`; retain the nonnegative-attempt check and partial `(created_at, id)` index where `published_at IS NULL`. The generic entity ID remains text. Preserve stable event identity, atomic business/event insertion, acknowledgment-based publication, duplicate tolerance, and the existing bounded publisher/reconciliation scope.

Use file-oriented image events: root file identity, authenticated space/memory context, and requested variant names; storage identity is resolved/checked against database records. Remove recipe-version fields from persistence and new generation payloads. Remove `schemaVersion` from the transport envelope, publisher, parser, and fixtures as well as its database column. Update entity terminology consistently across producer, parser, logging, and tests. Reconcile the transport-envelope change in the same rollout instead of silently assuming old messages remain compatible.

### 6. Adapt consumers as one coherent change

Retain current upload and memory-creation route names, standard API envelopes, authentication, photo limits, and creation idempotency. Public upload IDs refer to root file IDs; attachment no longer consumes a lifecycle state. Derive any returned upload expiry from creation. Remove the separate attachment deadline from responses and adapt actual consumers. Backend verification may remain in the existing creation flow; a standalone completion API is not required by this schema refactor.

Keep SQL/Prisma ownership in `packages/database`, authorization/attachment/outbox logic in API, and image processing in workers. Cleanup execution is deferred. Shared storage and contracts remain framework-agnostic. Use application-owned mocked-boundary tests rather than adding a database integration suite. Verify database constraints through migration review and a permitted disposable migration smoke check.

Keep operational Markdown guides outside source directories: project-wide guides belong in root `docs/`, and application/package guides belong in that owner's `docs/` with topic subfolders as needed. API guides live in `apps/api/docs/files/` and `apps/api/docs/memories/`; worker guides live in `apps/workers/docs/`. OpenSpec planning artifacts retain their tool-owned paths.

## Risks / Trade-offs

- Single recipe and immutable variant keys -> a future recipe change needs a deliberate replacement/regeneration policy; no hidden overwrites or persisted historical recipe machinery.
- No stored expiry -> changing the 600-second policy reinterprets old records; retain the established value and coordinate any future change.
- Deferred cleanup -> abandoned uploads and superseded sources consume storage until a separate cleanup implementation; retain attribution rather than deleting metadata early.
- Optional variants -> readiness is per file; unrelated or absent variants cannot block an original's readiness or redelivery of an explicitly requested subset.
- Empty file tables break old references/messages -> clear affected covers and attachments in a coordinated deployment, isolate old image events, and inventory old objects before dropping attribution.
- Existing web-app readers still query legacy asset tables -> complete and deploy a separate reader migration before applying this schema migration.

## Migration Plan

1. Inventory actual API/worker/shared/frontend consumers and old image-event backlog; record old bucket/key attribution for later cleanup. Document the approved loss of affected file metadata without discarding memory business records or retained physical media indiscriminately.
2. Pause affected writes/publication/worker execution and drain or quarantine incompatible image messages. Preserve unrelated outbox rows. Take a recoverable backup; approval to start empty does not authorize storage purges or unrelated resets.
3. Add a forward Prisma migration: clear affected cover references, replace file-related tables/enums/FKs, retain `outbox_event` and rename its columns in place, remove its schema-version column, and add checks/indexes. Preserve historical migrations, users, spaces, memory details, and unrelated event identities.
4. Generate the shared client; deploy matching storage, API, publisher/parser, image worker, and consumers. Reconcile queued payloads before resuming delivery. Cleanup has no worker or Terraform resources in this change.
5. Run backend gates sequentially and scoped frontend gates if consumers changed. Perform an isolated migration smoke check and controlled upload/generation verification; inspect pending/deleting records and DLQ outcomes before resuming normal traffic. Deleting records remain attributed while cleanup is deferred.
6. Rollback by pausing affected execution and restoring the coordinated pre-change database/application snapshot. A down migration cannot reconstruct discarded upload/attachment metadata. Reconcile physical objects and queued events before replay; do not simply point old code at the new schema.

## Affected-resource inventory and rollout controls

| Area | Current owner | Rollout action |
|---|---|---|
| Upload and memory APIs | `apps/api/src/modules/files` and `apps/api/src/modules/memories` | Pause issuance and creation during the schema cutover. Deploy upload verification, attachment, and cover changes together. |
| Browser upload client | `apps/web-app/src/features/memories/pages/create-memory/create-memory-request.ts` | Keep the existing upload and memory routes; remove the obsolete attachment-deadline response field. |
| Memory reads | Existing web-app detail, photo, timeline, Vault, and related-memory readers | Keep these readers unchanged in this change. They still reference legacy asset tables, so finish and deploy a separate reader migration before the schema cutover. |
| Storage operations | `packages/utils/src/storage` | Use each database-recorded object key in the application's configured `STORAGE_BUCKET`. Do not accept client-selected storage locations. |
| Event contract and publisher | `packages/utils/src/contracts/events/image-processing.event.ts` and `apps/api/src/common/outbox/outbox-publisher.ts` | Deploy producer and parser together. The old image envelope uses `memory_asset`, `aggregateId`, and recipe-version data; drain or quarantine those messages before enabling the new consumer. |
| Image worker and queues | `apps/workers/src/functions/image-processing` and `infra/modules/image-queue` | Pause image delivery and publication for cutover. Preserve DLQ evidence; do not replay legacy image messages through the new parser. |
| Worker deployment | `infra/environments/staging/worker.tf` and `infra/environments/floci-local/worker.tf` | Provision only the image-processing worker. Cleanup Lambda, schedule, credentials, and permissions are deferred. |
| Database metadata | `packages/database/prisma/schema.prisma` and `packages/database/prisma/migrations` | Clear affected cover references and replace only `file_uploads`, `memory_assets`, and `memory_asset_objects`. Retain `outbox_event` and rename its columns in place so unrelated events and their identities survive. |
| Object storage | Staging Cloudflare R2 (`infra/environments/staging/storage.tf`) and local Floci S3 (`infra/environments/floci-local/storage.tf`) | Inventory objects before metadata removal. The schema migration does not delete physical objects. |

Before applying the migration, pause affected writes, outbox publication, and image-worker delivery. Export the old rows' bucket/key attribution from `file_uploads` and `memory_asset_objects`, and list objects in every configured upload bucket with bucket, key, size, last-modified time, and whether an old row references them. Keep referenced memory media and unreferenced objects distinguishable; neither is part of an automatic purge. Record affected file-table row counts, pending image event IDs, DLQ message IDs, and unrelated unpublished outbox IDs.

Take and verify a recoverable database snapshot and retain the object inventory before replacing metadata. This change may leave `file_uploads`, `memory_assets`, and `memory_asset_objects` empty and clear old cover references, but it preserves users, spaces, memory business records and idempotency data, all unrelated outbox work, and physical storage objects. Do not truncate the database, delete the outbox, or delete a bucket as part of this rollout.

Resume traffic only after the new database client, API, publisher/parser, and image worker are deployed together and controlled upload, attachment, and generation checks pass. Cleanup is deferred and does not gate rollout. If rollback is needed, pause affected execution and restore the coordinated pre-change application and database snapshot; a down migration cannot reconstruct discarded file metadata. Reconcile the saved object inventory and quarantined queue messages before replaying anything under the old contract.

## Cleanup deferred

Remove the cleanup implementation, its tests, operations guide, and cleanup-specific Terraform from both environments. Select cleanup grace, batch size, operation timeout, and scheduling when that work is resumed separately. Keep the existing 600-second upload authorization lifetime and image-processing retry behavior.

## Asynchronous image readiness and replacement

Memory creation confirms source presence and commits uploaded files plus processing events. Content validation runs only in workers. Failed content does not roll back the memory. Generic lifecycle operations remain independent of image recipes and can confirm other authorized file purposes.

The worker validates the source and writes full-resolution, auto-oriented `original.webp` at quality 90 without enlargement/resizing. Cover/detail retain quality 85 and existing dimensions. Use a single downloaded source buffer for all outputs. Verify the candidate's stored bytes before swapping the same original row's key, MIME type, byte size, and ready status under the operation lease. Persist the old key as a deleting `upload_source` derivative in the same transaction; no new schema column is needed. Retry after a pre-swap crash verifies the immutable candidate; post-swap retries use the retained source while derivatives remain unfinished. Future abandonment cleanup must account for the deterministic candidate key.

Superseded sources are retained while cleanup is deferred. Future removal must use root ownership, wait for signed PUT expiry plus grace and terminal derivatives, and remove the old object before its attribution row. Invalid attached sources remain private and retained under the memory's existing retention policy.

Frontend read behavior and processing placeholders are unchanged by this proposal. Existing readers continue to use the legacy asset schema and must be migrated in a separate change before this schema is applied.
