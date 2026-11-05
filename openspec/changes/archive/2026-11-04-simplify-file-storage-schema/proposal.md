# Proposal

## Why

File ownership, original-object metadata, attachment, and generated images currently span three overlapping tables and multiple lifecycle enums. Consolidate stored objects into one file model, keep memory attachments minimal, and preserve attribution for future abandoned-upload cleanup without adding variant columns or persisting redundant deadlines.

## What Changes

- **BREAKING**: Replace `file_uploads` and `memory_asset_objects` with `files`, storing originals and optional named derivatives as rows with immutable unique keys in the application's configured bucket, without a bucket column.
- **BREAKING**: Replace `memory_assets` with `memory_files(memory_id, file_id, space_id, position)` and rename the memory cover reference to `cover_file_id`. PostgreSQL enforces same-space attachments and cover membership.
- Use only `pending`, `uploaded`, `ready`, `failed`, and `deleting` through the generated `FileStatus` constant map, and use the generated `FilePurpose` map for purpose values. Derive upload authorization expiry from creation plus the existing 600-second constant. Keep recoverable operation locks; remove persisted recipe versions, completion timestamps, and separate upload deadlines.
- Replace staging promotion with immutable direct upload and generic API HEAD presence confirmation. Create memories with uploaded originals; delegate content validation and full-resolution quality-90 WebP replacement to workers. Atomically swap the original's storage reference while retaining its file ID and durable superseded-source cleanup attribution.
- **BREAKING**: Retain the `outbox_event` table name, clarify entity/publication fields, and remove schema versions from persistence and the transport envelope while adapting producers and consumers coherently.
- Allow affected file tables to start empty, as explicitly approved. Preserve users, spaces, memory business records, and unrelated outbox work; coordinate old queue messages and storage objects during rollout.
- Defer cleanup implementation and cleanup-specific Terraform for separate, step-by-step learning. Image processing is the only worker; abandoned uploads and superseded sources remain stored with their attribution.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `file-upload-lifecycle`: Unified file records, immutable single-key verification, derived upload expiry, state transitions, and durable attribution while cleanup is deferred.
- `memory-creation`: Minimal same-space file attachments, file-based cover selection, and atomic creation without upload-consumption state.
- `memory-image-generation`: Optional named file derivatives, one maintained recipe, and per-file duplicate-safe execution without a processing status.
- `transactional-outbox`: Simplified table/field names, no persisted schema version, and file-oriented generation events.

## Impact

- Database schema and forward migrations in `packages/database/prisma`; historical migrations remain intact.
- API upload issuance, verification, memory transactions, outbox publishing, and their tests in `apps/api`.
- Image generation, event validation, and operation ownership in `apps/workers`; infrastructure provisions only the image-processing worker.
- Shared storage/contracts in `packages/utils`; consumers of changed upload/attachment responses where needed.
- Existing authentication, upload limits, cover/detail recipes, and memory soft-deletion retention remain in force. No new frontend screen, storage-provider migration, presigned-POST switch, or automatic outbox reconciler is introduced by this proposal.
- Existing single-memory, photo, timeline, Vault, and related-memory readers remain unchanged and are deferred to a separate change. They still depend on legacy asset tables, so coordinate their migration before applying this schema migration.
