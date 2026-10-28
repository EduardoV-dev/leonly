## 1. Contracts and provider feasibility

- [x] 1.1 Map current API authorization, response envelopes, Prisma identity types, workspace/deployment conventions, and creation-client boundaries; preserve existing users/spaces and keep reads outside this change.
- [x] 1.2 Define upload/create JSON contracts and version-1 image event contract with schema version distinct from recipe version; document the 10-minute URL lifetime and choose the independent attachment deadline plus lease durations.
- [x] 1.3 Record local first-write-wins promotion evidence using bounded staging GET and destination PUT with `If-None-Match: *`, including simultaneous writes and existing-destination reuse; retain the same implementation for R2 and defer live R2 verification to the pre-deployment follow-up.

Live R2 verification is deferred with user approval. The 2026-10-28 archive reconciliation closes this task for the locally verified scope; it does not claim live R2 results. Local Floci evidence and the outstanding provider checks are recorded in `provider-feasibility.md`.

## 2. Persistence and integrity

- [x] 2.1 Add Prisma enums/models and checked-in migrations for generic `file_uploads`, creation-only memories, finalized-only assets/objects, and `outbox_event`; include ownership, intended keys, verified metadata, lifecycle fields, and recoverable finalization/processing leases.
- [x] 2.2 Enforce user/space/key idempotency uniqueness, unique upload consumption, ordered-asset uniqueness, same-space creator/asset foreign keys, same-memory cover integrity, per-asset variant uniqueness, final-path uniqueness, and ready-object metadata checks.
- [x] 2.3 Add the eligibility and unpublished-event indexes needed by this flow, preserve existing user ID types, and verify Prisma generation/migration correctness without introducing a database integration test suite.

## 3. Storage and upload issuance

- [x] 3.1 Add the minimal shared S3-compatible storage operations and fail-fast environment validation for private R2 and local Floci; support browser-reachable signing endpoints without rewriting signed hosts.
- [x] 3.2 Implement authenticated `POST /api/files/uploads`, initially accepting only `memory_image` descriptors with existing JPEG/PNG/WebP limits; persist all issued upload identities before returning 600-second staging PUT capabilities.
- [x] 3.3 Separate declared descriptor validation from bounded final-byte validation/decoding; ensure API validation does not generate variants.
- [x] 3.4 Cover issuance authorization, unsupported purpose, count/size/type boundaries, durable ownership, required headers, exact signing expiry, and forbidden client-controlled paths through behavioral tests in the API test suite.

## 4. Promotion and memory transaction

- [x] 4.1 Implement recoverable upload finalization with claim tokens, persisted final keys before copy, destination-create-only promotion, final-copy validation, and retry reuse without overwriting originals; reject stale ownership and invalid immutable copies.
- [x] 4.2 Implement canonical creation normalization/hash and scoped existing-result lookup; reject changed-input key reuse with 409 and resolve successful retries before consumed-upload validation.
- [x] 4.3 Implement authenticated JSON `POST /api/memories` with established detail/date/cover validation and one transaction for memory, assets, ready original/pending variants, cover, upload consumption, and per-image outbox events.
- [x] 4.4 Handle concurrent insertion/consumption conflicts with transaction rollback followed by winner lookup or retryable in-progress outcomes; include no-image creation and no Redis dependency.
- [x] 4.5 Cover lost-response recovery, changed hash, concurrent requests, cross-user/space uploads, cover/order integrity, staging replacement, crash-after-copy recovery, stale leases, and atomic rollback through behavior-first web tests with controlled dependency failures.

## 5. Publication and durable recovery state

- [x] 5.1 Implement the shared bounded outbox-to-SQS send path with stable event envelopes, per-event attempts/errors, publication only after commit, and `published_at` only after acknowledgment.
- [x] 5.2 Wire immediate publication into creation without turning send/bookkeeping failures into failed committed creation, including mixed per-image publication outcomes.
- [x] 5.3 Retain bounded unpublished-event selection in the shared publisher and document that the operator replay CLI was removed at the user's request; defer both operator tooling and automatic reconciliation.
- [x] 5.4 Cover rollback-without-send, failed send with successful creation, partial publication, acceptance-before-bookkeeping failure, and repeated bounded publisher invocation through behavioral checks.

## 6. Image Lambda

- [x] 6.1 Add the image worker workspace and SQS handler with a separately runnable processing function, narrow shared contracts/database/storage reuse, and no API bootstrap, Next.js, or Supabase runtime dependency.
- [x] 6.2 Validate event/schema/recipe and authoritative original metadata; implement already-completed and unavailable-asset outcomes, processing leases, stale-attempt fencing, and deterministic output paths.
- [x] 6.3 Implement the existing Sharp recipe, bounded decoding/concurrency, resumable output uploads, verified ready metadata, and completion only after both variants are ready.
- [x] 6.4 Implement per-record partial batch failures, transient retry behavior, permanent failure codes, and structured event/asset diagnostics; cover duplicate delivery, interrupted ownership, partial outputs, malformed messages, and mixed batches with runnable behavioral checks.

## 7. Infrastructure and local execution

- [x] 7.1 Configure the private R2 bucket and permitted browser CORS, standard SQS queue/DLQ, Lambda event-source mapping with partial batch responses, least-privilege access/secrets, and compatible Sharp runtime packaging; add no R2 lifecycle rules or cleanup infrastructure.
- [x] 7.2 Select and document bounded Lambda memory/time/concurrency, visibility timeout, batch size, and redrive settings from measured processing behavior and deployment conventions.
- [x] 7.3 Add Floci S3/SQS startup/bootstrap configuration, ECR image publication, and automatic Lambda event-source execution; verify image processing, duplicate delivery, and restart persistence without a manual queue runner.
- [x] 7.4 Add a single-command local worker image rebuild/deploy without ECR publication, preserving Terraform settings and excluding API Lambda updates; verify failure handling and automatic processing with the locally built image.

## 8. Creation-client integration

- [x] 8.1 Apply relevant frontend/local instructions before editing the creation hook; replace create-only memory-grant submission with batch upload issuance, direct PUTs, and JSON creation using existing authenticated API plumbing.
- [x] 8.2 Preserve input/prepared upload IDs/key for unchanged retries, assign a new key for changed input, handle in-progress and field errors, and report committed success without waiting for variants; do not implement new reads or original fallback.
- [x] 8.3 Cover direct upload sequencing, partial upload recovery, uncertain creation response, changed input, single-flight behavior, and success with pending variants in the existing web test suite.

## 9. Verification and handoff

- [x] 9.1 Exercise local issuance → PUT → immutable promotion → creation → SQS → worker → ready variants, inspect persisted outcomes, and repeat a creation and worker delivery to verify stable identities; do not claim timeline rendering.
- [x] 9.2 Record Floci signing, HTTP CORS preflight, conditional PUT/reuse, and finalized-byte evidence; identify unverified live R2/browser behavior and document the accepted publication gap with no operator replay invocation.
- [x] 9.3 Run `pnpm --filter api check`, `pnpm --filter api typecheck`, `pnpm --filter api test:run`, and `pnpm --filter api build`; run equivalent worker checks once its scripts exist.
- [x] 9.4 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`, `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`; keep behavioral tests out of database integration suites.
- [x] 9.5 Document deployment/rollback ordering, no legacy data compatibility, deferred reads/fallback/replay CLI/publisher, and retained staging/unconsumed final objects with no cleanup guarantee; inspect the delivered infrastructure and event contract for accidental lifecycle rules, cleanup tasks, or deletion events.
