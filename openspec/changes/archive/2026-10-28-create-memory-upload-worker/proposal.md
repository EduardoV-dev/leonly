## Why

Memory creation currently finalizes photos and generates variants in the Next.js/Supabase request path. Move creation to the NestJS API, PostgreSQL, and private Cloudflare R2, with SQS-triggered Lambda processing, as the first bounded step toward removing Supabase.

## What Changes

- Add `POST /api/files/uploads` for batched image upload issuance, backed by feature-neutral `file_uploads` records and 10-minute presigned PUT URLs.
- Add NestJS `POST /api/memories` accepting JSON details and uploaded file IDs. Promote staging objects to server-only final keys and validate the final copies.
- Persist memory creation idempotency in PostgreSQL using `idempotency_key`, `creation_request_hash`, and a user/space-scoped unique constraint. Redis is not part of creation idempotency.
- Atomically persist memories, attached assets, original/variant metadata, consumed uploads, and one image-generation outbox event per image.
- Attempt bounded SQS publication after commit and retain unpublished events for future recovery. Generate variants in an independently deployed SQS-triggered Lambda.
- **BREAKING**: The new creation contract replaces memory-specific upload grants and synchronous variant generation. No legacy request compatibility, backfill, or dual writes are required.
- Defer memory reads, frontend original fallback, edit/comment/reaction migration, the operator replay CLI, automatic outbox publication, and all cleanup mechanisms. Do not configure R2 lifecycle rules. Live R2 compatibility checks remain a pre-deployment follow-up rather than an archive prerequisite for this locally verified slice.

## Capabilities

### New Capabilities

- `file-upload-lifecycle`: Authorized, purpose-specific upload issuance, durable staging/final tracking, and recoverable promotion without memory-domain staging rows.
- `transactional-outbox`: Atomic event persistence, bounded post-commit publication bookkeeping, and stable identities for future recovery.
- `memory-image-generation`: Versioned, retry-safe image processing through SQS and Lambda, with independent variant readiness.

### Modified Capabilities

- `memory-creation`: JSON creation through the API, PostgreSQL idempotency, atomic upload consumption, and success independent of variant completion or publication.
- `memory-lifecycle`: Private R2 creation storage, finalized-only asset metadata, and identifiers compatible with the existing API identity model.

## Impact

- `apps/api`: Files/memories modules, Prisma models and migrations, authorization, storage client, and outbox publication; no operator replay command.
- `apps/web-app`: Creation submission plumbing and behavioral tests; no new read endpoints or original-fallback implementation.
- A worker workspace for the image Lambda, shared event contracts where actually reused, and deployment configuration for private R2, SQS, DLQ, and Lambda.
- Local Floci S3/SQS configuration and a runnable local worker path; provider-specific final-copy semantics require verification against R2 and Floci.
- Dependencies required for S3 presigning, SQS, and image decoding/processing. Preserve existing NestJS, Prisma, Better Auth, and image recipe conventions.
- Existing Supabase-backed readers remain outside this slice and will not display new PostgreSQL memories. Staging and unattached final copies remain stored until a later cleanup change.
