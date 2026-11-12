# Tasks

## 1. Existing-model boundary and shared contracts

- [x] 1.1 Discard the unimplemented edit-attempt/reservation schema additions and retain the existing persistence models; verify Prisma generation and database-package typecheck succeed without a new migration, reset, or changes to creation's idempotency identity.
- [x] 1.2 Define shared editor snapshot, strict save request, and committed result contracts without edit IDs, idempotency keys, progress states, or status/resume endpoints; verify tests reject invalid fields/IDs and preserve the deployed creation image-event contract unchanged.
- [x] 1.3 Implement creation-compatible text/UUID normalization and strict save DTO validation for exact timestamps, real dates, timezone, retained/upload references, duplicates/overlap, ten final photos, and valid cover/remove-all; verify focused API-owned boundary tests without adding edit request hashing.

## 2. Authorized editor reads

- [x] 2.1 Add `GET /api/memories/:memoryId/edit` with server-derived active-space access for either member and generic unavailable handling; verify both placements, missing membership, malformed/missing/deleted/cross-space targets, and unexpected lookup failures.
- [x] 2.2 Return editable metadata, explicit cover ID, exact timestamp, complete persisted-order attached photo IDs, and nullable 300-second signed previews; verify cover-last order, pending/failed variants, ready retained photos, non-serving files, no storage-key fields, and `Cache-Control: no-store`.
- [x] 2.3 Document the snapshot route through existing OpenAPI/Scalar; verify generated schemas/examples match shared contracts, generic 404s, nullable previews, and effective signed-URL expiry.

## 3. Atomic save using current upload and attachment infrastructure

- [x] 3.1 Add `PATCH /api/memories/:memoryId` using the strict save DTO, eligible requester-owned new uploads, and current attachment authorization for retained photos from either member; verify safe reference errors, immutable PUT/upload confirmation behavior, and existing creation consumers.
- [x] 3.2 Reuse existing expiring file claims and exclusive root attachment for creation/edit and edit/edit races; recheck ownership, expiry, eligible unattached state, and same-space scope inside the transaction, and verify rollback/release does not consume uploads or clear a newer worker claim.
- [x] 3.3 Save normalized metadata/placement using the atomic authorized exact-timestamp predicate and existing strictly advancing trigger; verify matching, stale, no-op, rapid successive, concurrent edit, and unavailable outcomes with API-owned transaction tests.
- [x] 3.4 Commit retained relative order, appended uploads, contiguous unique positions, valid cover, and remove-all atomically; preserve retained objects/ready variants, creator, creation key/hash, comments, reactions, and untouched metadata, and verify both-member retained-photo ownership behavior.
- [x] 3.5 Detach explicit removals and mark their original/derivative families deleting at commit without waiting for additions; verify A/B/C to A/C/D with pending D, removal-only edits, retained-file isolation, and no delayed replacement or restoration on new-photo failure.
- [x] 3.6 Persist one existing-shape outbox event per new attachment in the save transaction and publish through the existing bounded publisher after commit; verify event failure rolls back the whole edit, post-commit publication failures do not claim rollback, stable duplicate-delivery identity, and no events for retained/metadata/removal/cover-only saves.
- [x] 3.7 Return HTTP 200 with the persisted `{ id, visibility, updatedAt }` only after commit; document the strict request, no-store envelope, 400/401/404/409/safe 5xx behavior, asynchronous processing, unchanged creation idempotency, and no edit key, status resource, 202 preparation, or finalize protocol.

## 4. Existing worker and per-photo display behavior

- [x] 4.1 Verify the deployed creation event and existing attached-file worker handle new edit attachments with current recipes, immutable outputs, leases, ready-output reuse, retry limits, and dead-letter evidence; make only required fixes and add no staged-edit event context or memory-finalization authority.
- [x] 4.2 Verify ready retained photos render independently beside pending/failed additions, retained variants are never reprocessed by an edit, selected pending cover uses the normal fallback without hiding ready gallery photos, and actual content failure leaves saved metadata/removals intact.
- [x] 4.3 Verify removal/deletion during processing and duplicate delivery cannot revive detached/deleting files; retain attribution for in-flight writes and preserve existing partial-batch/retry behavior through worker-owned tests.
- [x] 4.4 Verify placement-first makes Save stale, deletion-first makes it unavailable, and edit-first preserves subsequent bodyless deletion with no new version precondition; cover rollback and file eligibility interleavings through API/worker-owned behavior tests.

## 5. Shared editor and detail entry points

- [x] 5.1 Replace the editor server loader with the current-backend snapshot while retaining route, metadata, boundaries, and shared form; verify prefill, both placements, cover identity, ordered photos, nullable retained previews, and generic unavailable behavior without Supabase calls.
- [x] 5.2 Replace legacy grants with current issuance and immutable PUT, preserving local values/files, captured timezone, and eligible upload identities on definite pre-commit retry; verify partial upload failure, PUT 412 recovery, validation, and fresh identities for corrected bytes.
- [x] 5.3 Implement single-flight upload/save and accessible pending/error states without image-readiness polling or resume/finalization; distinguish definite rollback from uncertain transport outcomes, require current-state reload before another deliberate save on uncertainty/conflict, and verify no blind replay or silent timestamp rebase on timeout, lost response, abort, or unmount.
- [x] 5.4 Restore accessible Edit links only on authorized Timeline/Vault detail, preserving migrated Delete confirmation and contextual placement; verify both placements and absence of Edit on summary surfaces.
- [x] 5.5 On confirmed commit reset list chains to page one, refresh dashboard/detail/related reads, toast, and navigate to final placement before new variants finish; verify retained photos remain visible, only unavailable variants fall back, removals disappear immediately, later refresh can show ready additions, and cancel-before-submit returns to initial placement without mutation.

## 6. Legacy boundary and delivery documentation

- [x] 6.1 Trace remaining consumers of legacy edit routes, upload grants, preview readers, and helpers; remove only superseded edit-only Supabase paths and update tests, verifying migrated editor/previews never fall back to Supabase and retained consumers still work.
- [x] 6.2 Update US-007 and API/application/worker documentation for commit-before-processing, preserved retained photos, immediate committed removals, per-photo failure, no attempt models/historical result replay, uncertain-response reload, signed-URL expiry, and deferred cleanup; preserve ten-photo/concurrency rules and predecessor deletion behavior.

## 7. Integration gates

- [x] 7.1 Run `pnpm --filter 'api...' --filter 'workers...' check`, then `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 typecheck`, then `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 test:run`, then `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 build`; verify all backend gates pass serially without concurrent shared-client generation.
- [x] 7.2 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`, `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`; verify all web gates pass for the completed implementation.
- [x] 7.3 Exercise metadata-only, shared-member, retain/add/remove, remove-all, and placement edits against the available local stack; observe retained-photo continuity beside new fallbacks, immediate removals, later readiness/failure, stale saves, uncertain-response reload, and affected-view refresh, recording results or exact environment blockers without a database test suite.
- [x] 7.4 Run `openspec validate migrate-memory-editing-to-nestjs --strict` and verify change specs, OpenAPI, and backlog agree with existing-model asynchronous edits and predecessor bodyless deletion contracts.

## Workflow follow-up

- Sync/archive the completed `migrate-memory-deletion-to-nestjs` change before syncing this change's overlapping detail/API deltas; preserve bodyless deletion and its migrated Delete action.
- After implementation and user-directed completion, sync/archive this change and verify main specs preserve both migrations without reintroducing Supabase editing, durable attempt/reservation models, delayed replacement, or immediate URL revocation promises.
