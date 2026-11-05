# Tasks

## 1. Database schema and rollout boundary

- [x] 1.1 Inventory affected API, worker, shared-contract, storage, and frontend consumers; document the file-only empty-table rollout, legacy image messages, object inventory, and backup/restore procedure. Verify the inventory distinguishes retained memory media and unrelated outbox work from approved file-metadata disposal.
- [x] 1.2 Replace file-related Prisma models/enums with the exact `files` and four-column `memory_files` design, omit the file bucket column, rename the cover to `cover_file_id`, and simplify `outbox_event` without renaming the table. Verify Prisma validation/client generation and review every field/default against `design.md`.
- [x] 1.3 Write a forward migration with same-space FKs, cover membership, uniqueness/check constraints, cleanup indexes, and the partial unpublished-event index; preserve historical migrations and rename outbox fields in place. Verify SQL scope and constraint rejection/success cases through a permitted disposable migration smoke check, without adding a database integration suite or touching a shared database.

## 2. Storage and upload verification

- [x] 2.1 Update shared storage operations to use authoritative per-row keys in the configured bucket, without an approved-buckets environment variable or operation overrides, preserving immutable conditional upload/write behavior. Verify collocated storage tests cover configured-bucket routing, duplicate-key rejection, missing objects, and failed removal.
- [x] 2.2 Issue original file rows and signatures from the same creation instant using the existing 600-second policy; remove staging promotion and attachment-deadline response fields. Verify API issuance tests cover authorization, limits, server-controlled keys, exact derived expiry, and adapted consumers.
- [x] 2.3 Replace finalization state with presence/content verification and token/expiry-guarded operation ownership; preserve accepted MIME/size checks and bounded BIGINT-to-JSON conversion. Verify API tests cover spoofed metadata, invalid bytes, uploaded-versus-ready behavior, transient errors, interrupted verification, stale owners, and lost-response retry.
- [x] 2.4 Document the upload state/expiry contract and any changed response fields under the owning application's or package's root `docs/`, with topic subfolders as needed. Use generated status/purpose maps in API and worker code. Verify documented examples match implemented schemas and do not introduce an unrequested completion endpoint or upload-method switch.

## 3. Memory attachments and outbox

- [x] 3.1 Replace asset consumption with ready-root attachment, ordered `memory_files`, and `cover_file_id` in the creation transaction; coordinate root ownership with cleanup. Verify API behavior tests cover same-space ownership, unique attachment/position, invalid derivatives, cover membership, rollback, and unchanged creation idempotency.
- [x] 3.2 Adapt event insertion, publisher selection/bookkeeping, and fixtures to renamed outbox fields without a persisted schema version. Verify outbox tests cover stable event identity, acknowledgment-only publication, bounded pending order, mixed outcomes, and success despite publication failure.
- [x] 3.3 Coordinate producer/parser/worker message identity and requested variant names; remove recipe-version payload dependencies and all transport schema-version fields and checks. Verify shared contract tests accept versionless events, reject forged context, and cover the documented legacy-message rollout policy.
- [x] 3.4 Adapt actual upload, memory, and cover consumers affected by the schema/response changes. Keep memory readers unchanged and document their separate migration prerequisite. Verify owning application tests and document the new association/cover semantics and outbox field names.

## 4. Idempotent named variants

- [x] 4.1 Generate/resume optional derivative file rows through `original_file_id` and text `variant_name`, with one maintained recipe and the configured storage bucket. Verify worker tests preserve current decoding/resize/quality bounds, reject root/context mismatches, and complete only the requested supported variant subset.
- [x] 4.2 Move generation ownership to per-file operation locks and preserve immutable writes plus existing-object verification. Verify worker tests cover duplicate deliveries, partial success, a crash between object write and ready update, stale ownership, independent variant progress, and a deleting root preventing new derivatives.
- [x] 4.3 Preserve partial-batch retry behavior and implement a bounded exhausted-retry failure path consistent with DLQ delivery. Verify transient errors do not prematurely set failed, permanent/exhausted errors affect only eligible unfinished files, and ready/deleting rows are not downgraded; document operational failure/retry behavior.

## 5. Cleanup deferred outside this change

The cleanup implementation, tests, operations guide, and cleanup-specific Terraform have been removed at the user's request. Reintroduce candidate selection, deletion ownership/recovery, and infrastructure separately, step by step. Image processing is the only worker. Retain abandoned uploads and superseded-source attribution until that work is implemented.

## 6. Integrated verification and handoff

- [x] 6.1 Run backend gates one at a time: `pnpm --filter 'api...' --filter 'workers...' check`, then `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 typecheck`, then `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 test:run`, then `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 build`. Record results and any unavailable evidence.
- [x] 6.2 If frontend consumers changed, run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`, `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`; verify affected upload/creation behavior without broadening into deferred UI work.
- [x] 6.3 Perform the scoped EV completion review and verify migration/queue/object rollout documentation against the implemented schema and event contract. Record the source revision, selected rule paths, concurrency/migration evidence, and remaining deployment-only checks.

## Verification record

The records below describe earlier implementation states. Their cleanup results do not establish current cleanup support; cleanup was subsequently removed and deferred. Verification for the removal is recorded in the cleanup-deferral entry below.

- Source: `development` at `ae35261b1c020b05ccd9ec0e38f9aafe34ebde2a`; working tree is dirty.
- Rules reviewed: `.agents/skills/ev-coding-standards/references/pre-coding.md`; `.agents/skills/ev-code-review/references/{general,backend,frontend,logical-code-grouping,coverage}.md`; `.agents/skills/ev-review-typescript/SKILL.md` and `references/examples.md`; `.agents/skills/ev-review-react/SKILL.md` and `references/examples.md`; `.agents/skills/ev-review-nestjs/SKILL.md` and `references/{examples,http}.md`; `.agents/skills/ev-api-contracts/SKILL.md`, `assets/contracts.md`, and `references/examples.md`.
- Backend: `check`, serialized `typecheck`, serialized `test:run`, and serialized `build` passed. The test run passed 4 database, 62 utils, 289 API, and 38 worker tests.
- Web app: `check`, `typecheck`, `test:run` (590 tests), and `build` passed. The affected creation-request tests passed.
- Migration smoke passed against a disposable PostgreSQL database; Terraform formatting/validation passed for staging and Floci-local.
- At the Task 6.3 verification point, the browser creation flow wrote through the Nest/Prisma API while memory/photo readers still queried Supabase `memory_assets` and `memory_asset_objects`. All read paths remain unchanged and out of scope; migrate them before applying the schema migration. Staging plan/apply, live R2 checks, shared-database migration, and queue drain/quarantine were not performed.

## Workflow follow-up

### Requested schema refinements verification

- Baseline: `9c220b6fc52eb235c15ea7d3d25bad514afc7977`, with existing staged, unstaged, and untracked work preserved. Rule source checkout: `edb8b4cb8e9a2a96a13859067657cb7509147a9e` (clean); selected project-local rules are under `.agents/skills/`.
- Applied `.agents/skills/ev-coding-standards/references/{pre-coding,examples}.md`, `.agents/skills/ev-code-review/references/{general,backend,logical-code-grouping,generation-review}.md`, `.agents/skills/ev-review-typescript/SKILL.md` and `references/examples.md`, and `.agents/skills/ev-review-nestjs/SKILL.md` and `references/{examples,http}.md`. Relevant NestJS companion rules cover input validation, mocked external services, and transactions. Review remained in the current agent thread.
- Removed the file bucket column and approved-buckets environment setting; storage uses configured `STORAGE_BUCKET`. Kept `outbox_event`, removed persisted/transport schema versions, and used generated `FileStatus`/`FilePurpose` objects in lifecycle code and purpose validation.
- Moved API guides from `src/modules/*/docs/` into `apps/api/docs/files/` and `apps/api/docs/memories/`. Worker guides remain in `apps/workers/docs/`; OpenSpec artifacts retain tool-owned paths.
- Backend format/lint, serialized typecheck, and serialized build passed. Tests passed: 4 database, 61 utils, 289 API, and 37 workers. The worker suite was rerun after fixing its remaining bucket-prefixed conflict fixture. Prisma validation and client generation passed; `git diff --check` passed.
- Migration SQL was reviewed, including unique object keys and preservation of the existing outbox table/index. No database migration or live storage/queue checks were performed for these refinements. Frontend code was not changed in this refinement pass, so frontend gates were not rerun. No maintained EV Prisma-specific companion was available; general/backend rules, generated client types, and Prisma validation supplied the applicable evidence. Existing task 6.3 remains open.

- Apply and deploy only through the coordinated database/application/queue rollout described in the design; metadata disposal does not authorize unrelated data or storage purges.
- Sync delta specs and archive after implementation, verification, and the project's review requirements are satisfied.

## 7. Asynchronous original validation and processing

- [x] 7.1 Replace memory-specific finalization with generic FilesService HEAD-only presence confirmation; attach uploaded originals and preserve authorization, idempotency, leases, and transaction/outbox behavior.
- [x] 7.2 Validate originals in workers, write full-resolution quality-90 original.webp, and atomically swap the original row with durable superseded-source attribution. Preserve source-buffer cover/detail generation and retry fencing.
- Deferred outside this change: 7.3 Superseded-source deletion after authorization plus grace. Retain source attribution and image-processing retry behavior without a cleanup worker.
- [x] 7.4 Complete final formatting, typecheck, tests, builds, and scoped completion review; record runtime/deployment verification gaps.

### Asynchronous image workflow verification

- Baseline: `9c220b6fc52eb235c15ea7d3d25bad514afc7977`, preserving existing staged, unstaged, and untracked work. Maintained standards source: `edb8b4cb8e9a2a96a13859067657cb7509147a9e` (clean). Review and implementation stayed in the current agent thread.
- Selected project-local rules: `.agents/skills/ev-coding-standards/references/{pre-coding,examples}.md`; `.agents/skills/ev-code-review/references/{general,backend,frontend,logical-code-grouping,generation-review}.md`; `.agents/skills/ev-review-typescript/{SKILL.md,references/examples.md}`; `.claude/skills/ev-review-nestjs/{SKILL.md,references/examples.md,references/http.md}`; `.agents/skills/ev-review-react/{SKILL.md,references/examples.md}`; `.agents/skills/ev-review-nextjs/{SKILL.md,references/examples.md}`; `.agents/skills/ev-api-contracts/{SKILL.md,assets/contracts.md,references/examples.md}`. Applied relevant installed NestJS/Vercel guidance, application DESIGN.md/PRODUCT.md, and Impeccable craft/hardening guidance. Biome 2.5.5 enforces formatting and supported file-size limits; logical grouping was also reviewed semantically. No maintained Prisma-specific EV companion was available.
- Backend gates passed sequentially: `pnpm --filter 'api...' --filter 'workers...' check`; `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 typecheck`; the same selection/concurrency with `test:run`; and with `build`. Final tests: database 4, utils 68, API 290, workers 50.
- Frontend gates passed for the prior reader implementation. The reader and processing-placeholder changes were subsequently removed to keep this change limited to schema, upload, worker, cleanup, and memory creation behavior; final frontend checks are recorded in the scope-correction entry below.
- Scoped review checked HEAD-only creation, ownership/lease fencing, invalid-source handling, full-resolution quality-90 replacement, atomic reference swap/source attribution, pre/post-swap retry recovery, source deletion interruption, upload-expiry/grace, active operations, and attachment retention. No original body download remains in creation.
- `git diff --check` and `openspec validate simplify-file-storage-schema --strict` passed for the previous scope. Reviewed the existing forward migration and generated the Prisma client; this follow-up adds no schema change and applied no migration.
- Deployment-only gaps: no live R2/SQS upload-to-ready smoke test, scheduled cleanup invocation, shared-database migration, or queue drain/quarantine was performed. Memory detail/photo/list readers remain on their old implementations and query legacy asset tables; complete a coordinated reader migration before applying this database migration. Keep cleanup opt-in until rollout checks pass. Existing Supabase editors, comments, reactions, and resource cleanup also remain separate workflows.

### Memory reader scope correction

- Removed the file-backed memory and photo read endpoints and restored the web-app detail, photo, timeline, Vault, and related-memory readers to their pre-change implementations. Upload issuance and memory creation still use the simplified file model.
- The restored readers query legacy `memory_assets` and `memory_asset_objects`; the schema migration removes those tables. A separate reader migration is a prerequisite to applying this schema change.
- Baseline: `9c220b6fc52eb235c15ea7d3d25bad514afc7977`; working tree was already dirty with staged, unstaged, and untracked work, all preserved. Applied local EV pre-coding, general/backend/frontend, logical grouping, generation-review, Next.js, React, TypeScript, NestJS, and API-contract rules.
- Verification: backend `check`, serialized `typecheck`, `test:run`, and `build` passed (62 utils, 282 API, 50 worker tests). Web-app `check`, `typecheck`, `test:run` (590 tests), and `build` passed; the focused creation-request tests passed (6 tests). `openspec validate simplify-file-storage-schema --strict` and `git diff --check` passed.
- Correction standards: `.agents/skills/ev-coding-standards/references/{pre-coding,examples}.md`; `.agents/skills/ev-code-review/references/{general,backend,frontend,logical-code-grouping,generation-review}.md`; `.agents/skills/ev-review-{typescript,react,nextjs}/{SKILL.md,references/examples.md}`; `.claude/skills/ev-review-nestjs/{SKILL.md,references/{examples,http}.md}`; `.agents/skills/ev-api-contracts/{SKILL.md,assets/contracts.md,references/examples.md}`; `/home/eduardovdev/.config/opencode/skills/cognitive-doc-design/SKILL.md`.
- Biome initially found a formatting issue in `apps/api/src/modules/files/files.service.ts:30`; the constructor brace was corrected and all backend checks then passed.

### Cleanup deferral

- Removed `apps/workers/src/functions/file-cleanup/`, its tests/fixtures, and the cleanup operations guide. Removed cleanup Lambda, IAM/logging, staging schedule/invocation wiring, variables, and ECR permission from the two Terraform environments. Image processing, source attribution, and retry behavior remain intact.
- Cleanup is outside this change so it can be implemented separately, step by step. Abandoned uploads, superseded sources, and pre-swap candidates remain stored; no automatic file deletion runs.
- Baseline: `cbe10693f390a4eca8948345c075ccc7d9339da8`; existing staged, unstaged, and untracked work was preserved except the explicitly removed cleanup files. Maintained standards source: `dcc361f5ed2e3d4481546c978da7c9bb8f728049` (clean). Applied EV pre-coding/examples, project-local general/backend/logical grouping/generation guidance, TypeScript rules/examples, and cognitive documentation guidance. No maintained EV Terraform-specific companion was available.
- Backend gates passed sequentially: `pnpm --filter 'api...' --filter 'workers...' check`, then the same selection with `--workspace-concurrency=1 typecheck`, `test:run`, and `build`. Tests passed: database 4, utils 62, API 283, workers 33.
- Terraform recursive formatting and validation for staging and Floci-local passed, as did strict OpenSpec validation and `git diff --check`. No Terraform plan/apply, live storage/queue test, or migration was performed. Frontend code was unchanged by this removal, so frontend gates were not rerun.
