# Implementation verification

All 35 tasks are closed for the user-approved locally verified scope as of
2026-10-28. Production configuration is authored, not applied; live R2 verification
remains a pre-deployment follow-up. Previously recorded application gates and the
persisted local flow/duplicate checks are historical evidence, not new runs made
by the archive reconciliation.

## Completed checks

| Scope | Command/evidence | Result |
|---|---|---|
| Production Terraform | `validate`, mocked `test` | Valid; 5 tests passed |
| Local Terraform | `validate`, mocked `test` | Valid; 2 tests passed |
| Shared queue module | `validate`, mocked `test` | Valid; 1 test passed |
| Terraform formatting | `terraform fmt -check -recursive infra` | Passed |
| API | `pnpm --filter api check`, `typecheck`, `test:run`, `build` | Passed; 266 tests |
| Workers | Equivalent four worker commands | Passed; 22 tests |
| Web TypeScript | `pnpm --filter web-app typecheck` | Passed |
| Full web lint | `pnpm --filter web-app check` | Passed; 455 files |
| Full web tests | `pnpm --filter web-app test:run --maxWorkers=2 --minWorkers=1` | Passed; 100 files, 589 tests |
| Web production build | `pnpm --filter web-app build` | Passed |
| Creation client | `pnpm --filter web-app exec vitest run src/features/memories/pages/create-memory --maxWorkers=2 --minWorkers=1` | 21 tests passed |
| Patch whitespace | `git diff --check` | Passed |

The first attempted targeted web invocation with `test:run -- <path>` started
the full suite and timed out at 120 seconds. The direct `exec vitest run <path>`
command above verified the intended scope. The subsequent full suite passed
with bounded worker concurrency as recorded in the table.

## Creation-client behavior

Creation uses the existing authenticated Axios API client, batches descriptors
through `/files/uploads`, performs direct PUTs with issued headers and omitted
credentials, then posts JSON to `/memories`. It does not call memory grants or
Supabase storage. Editing retains its existing submission path.

Behavioral checks cover ordered server-issued upload IDs and cover mapping,
partial upload recovery without repeating completed PUTs, uncertain creation
response retries with identical keys/uploads/timezone, changed-input keys,
same-turn single-flight submission, in-progress feedback, server-field errors,
and success without variant polling. Prepared capabilities stay in component
memory; the existing draft stores only written values and photo names.

DOM interaction evidence: empty submission shows title/date field errors;
photo selection adds previews; cover selection changes the selected radio;
remove controls remove the selected photo; repeated submit starts one request;
successful committed creation follows existing navigation; declining draft
discard keeps the form open. These are Testing Library interactions, not a live
authenticated browser walkthrough. No new timeline/read compatibility is claimed.

## Baseline web lint repair

The initial `pnpm --filter web-app check` reported 18
`lint/style/noNestedTernary` errors in 9 previously unchanged files. The user
approved fixing them. Flat derived labels/state and exclusive JSX branches now
preserve their original behavior:

- `src/features/memories/components/memory-chronology/index.tsx`
- `src/features/memories/components/memory-delete-action/index.tsx`
- `src/features/memories/components/memory-editor-form/index.tsx`
- `src/features/memories/components/memory-editor-photo-workspace/index.tsx`
- `src/features/memories/hooks/use-comment-composer.ts`
- `src/features/memories/hooks/use-comment-deletion.ts`
- `src/features/memories/pages/edit-memory/use-edit-memory-form.ts`
- `src/features/partner-invite/components/partner-invite-status/index.tsx`
- `vitest.setup.ts`

Paths above are relative to `apps/web-app`. The creation hook's draft-notice
expression was also flattened within its original change scope. The full lint,
TypeScript, test, and build gates now pass, completing task 9.4.

## Persisted local flow (task 9.1)

The earlier missing-table prerequisite is resolved: a fresh read-only query to
`localhost:5434/leonly` found `memories`, `file_uploads`, and `outbox_event`.
This continuation did not apply migrations.

Reran `node /tmp/opencode/leonly-memory-flow.cjs` successfully against the built
API/worker code and live local services. It used a native Better Auth fixture
session and real authenticated HTTP endpoints, PostgreSQL transactions, signed
Floci PUTs, and SQS delivery to the production `processImage` function.

| Check | Observed result |
|---|---|
| Unauthenticated issuance / authenticated issuance | HTTP 401 / 201; signed expiry 600 seconds |
| Direct PUT, promotion, JSON creation | HTTP 200 / accepted final original / HTTP 201 with Vault visibility |
| Before worker processing | Original ready; cover/detail pending; event published |
| Replace staging and repeat creation | Original bytes unchanged; same memory ID; one memory and one outbox event |
| SQS processing and redelivery | `completed`, then `already_completed`; three object records unchanged on redelivery |

Retained fixtures identify the run: bucket/queue
`leonly-flow-probe-1791771768358`, space
`01a12deb-809a-780c-9838-47793500ccaf`, memory
`01a12deb-8276-753b-99f1-606be579afa7`, upload/asset
`01a12deb-8195-744e-8a36-6be5dc91c4be`, and event
`01a12deb-8293-7117-ac7a-e4457e3d6b8f`.

An independent read-only database join confirmed the upload is consumed, the
event is published, and original/cover/detail are ready with byte sizes
18,379/1,476/2,264. Both generated outputs decode as WebP and their stored sizes
match database metadata. All isolated records and storage objects remain
retained. The probe does not establish browser CORS, live R2 compatibility, or
timeline rendering, and adds no database integration test suite.

## Automatic Floci image Lambda (2026-10-14)

Replaced the host-side queue runner with local ECR publication and Terraform-managed
Lambda/SQS mapping. Built `apps/workers/Dockerfile` for linux/amd64, pushed to Floci's
path-style ECR registry, and deployed digest
`sha256:881a52df199ac0d27bda5ee861ee4ff7f50cb72d6192f681ba307b7b50c1b73d`.
The enabled mapping uses batch size 1 and `ReportBatchItemFailures`.

Floci 2.1.0 invoked the actual container handler automatically after an SQS send.
An isolated, explicitly labelled `[Local Lambda verification]` memory fixture had
three ready objects; both generated outputs decoded as WebP and their sizes matched
database metadata. CloudWatch logs reported `completed`, followed by `already_completed`
for duplicate delivery. No `processImage` or manual worker invocation was used by the probe.
This verifies the queue/container boundary; it does not repeat browser creation verification.

Restarted Floci with persistence enabled, confirmed the mapping remained `Enabled` and
the bucket objects survived, then repeated automatic generation successfully. Fixture
memory IDs are `01a13c29-ffd3-778c-9a27-8caacfd5c49b` and
`01a13c2c-038c-7df8-9fd3-b557ebbfb684`. Fixtures and objects are retained.
The previous user-created memory's 32 storage objects were backed up and restored when
switching the existing memory-only emulator to persistent mode; its database was unchanged.

Removed `local:run`, runner sources/tests, and worker-owned SQS publisher configuration.
Worker check/typecheck/test/build passed (19 tests); Docker image build and native Sharp
smoke check passed. See `infra/local-image-worker.md` for bootstrap, publication, updates,
logs, and rollback. Pause `image_processing_enabled` or restore a prior digest to roll back
the runtime without removing database records or storage.

After removing the runner-only direct SQS dependency, rebuilt/pushed the final image and
updated Lambda to digest
`sha256:c5b26ce6a354fcea5bd666169196786cc6b0c085fc0bd7cec36aaab17e339ada`.
Repeated automatic generation with the final image for fixture memory
`01a13c2f-f360-7b5a-a5f8-9e97c3cb732d`; all three variants became ready.
The local Terraform validation and both mocked worker deployment tests passed.

## Single-command local image updates (2026-10-14)

Added `pnpm workers:deploy:local`, backed by a dependency-free Node TypeScript tooling
script. It builds the existing worker Dockerfile under a fresh AWS-shaped local reference,
validates/applies a saved worker-only Terraform plan, persists only the local-image setting
in ignored tfvars, and waits for Lambda readiness. CLI calls use explicit local endpoints
and local test credentials. ECR publication is skipped; the existing digest remains stored
for switching back to the optional registry verification flow.

Ran the real command successfully: Terraform changed only the worker Lambda to
`000000000000.dkr.ecr.us-east-1.amazonaws.com/leonly-image-worker-local:dev-1792017884226-d4420783`.
An SQS probe then generated both WebP variants automatically for retained fixture memory
`01a13c98-e151-72ce-9d57-73a75256b526`; all three object rows became ready and stored bytes
matched their recorded sizes. No worker invocation or ECR push was used by the probe.
The fixture is explicitly labelled `[Local Lambda verification]`.

The command tests cover fresh references, retained settings, build/apply failures, and
rejection of API or destructive plans. The Terraform local-image test verifies precedence
over a retained digest and keeps the SQS mapping. The runtime change is local-only;
production Terraform still requires a pushed image digest.

All five command tests, strict script typechecking, Biome checks, Terraform validation,
and three mocked Terraform runs passed. CloudWatch recorded `completed` followed by
`already_completed` for the local-image probe.

## Archive reconciliation (2026-10-28)

The deployment-command tests, Terraform mocked tests, and their package test command
were subsequently removed at the user's request. The results above remain historical
verification evidence; those test suites are no longer shipped.

The user requested completion, reconciliation, and archival. Tasks 1.3/9.2 now
record the existing local evidence and explicitly defer live R2 conditional
PUT/reuse, production signing, and browser CORS verification until before
production enablement. HTTP preflight evidence is not a browser upload result.
`provider-feasibility.md` retains the outstanding checks and measured limitations.

Proposal, design, tasks, and the transactional-outbox delta now agree with the
prior removal of the replay CLI and `apps/api/README.md`: the bounded shared
publisher remains, but no operator invocation or scheduled publisher ships.
Unpublished events remain durable and variants can remain pending indefinitely.
Task 5.3 records this delivered scope rather than claiming a removed CLI exists.

The delta requirements preserve the existing scenario identities and legacy
reader/RPC authorization guarantees, while explicitly separating unchanged
Supabase readers from new PostgreSQL creation. Strict change validation passes.

### Deployment and rollback handoff (task 9.5)

1. Provision the additive schema and private storage/queues; preserve existing
   user and space identities. Publish a compatible worker image before enabling
   API publication. Follow `infra/README.md` for digest bootstrap and deployment.
2. Complete live R2 conditional-write/reuse, signing, and browser CORS checks
   before enabling production creation. Switch only creation-client submission;
   no legacy request compatibility, backfill, dual writes, new readers, or
   original-image fallback is included.
3. To roll back, stop new creation/publication traffic and pause the event-source
   mapping; restore a compatible retained worker digest when needed. Preserve
   schema, queues, events, and all objects. Do not drop data or destroy storage.

Inspected staging/local storage resources, queue/worker Terraform, and the image
event contract. The delivered resources contain no object-expiration/lifecycle
rules, cleanup schedules, or staging-deletion event contract. Staging and
unconsumed final objects remain retained without an eventual-deletion guarantee.
Cleanup, read migration, operator replay, and automatic reconciliation remain
follow-up work.

### Archive-time checks

- Strict validation of the reconciled change passed before archival. Archive
  synchronized all five capability deltas: 14 added and 6 modified requirements,
  with no removed requirements. `openspec list --json` reports no active changes.
- `openspec validate --specs` passed all 23 main specs. The broader `--strict`
  run fails on requirement-length warnings across 12 specs, including the two
  modified memory specs; it reports no structural spec errors.
- Backend workspace check, serialized typecheck, serialized tests, and serialized
  build passed. The API suite passed 266 tests and the worker suite passed 19.
- Web Biome check passed across 455 files. Explicit web typechecking, the full
  test suite (100 files, 589 tests with `--maxWorkers=2 --minWorkers=1`), and the
  production build passed. Git hooks are not configured in this checkout, so
  these gates were run directly rather than relying on commit/push hooks.
- The local deploy script passed Biome and Node's strip-types syntax check;
  deployment-command tests remain removed as previously requested.
- Terraform recursive formatting and validation of staging, local Floci, and
  the shared image queue module passed. No infrastructure was applied and no
  live provider or persisted-flow probe was rerun during archive reconciliation.

The runtime evidence above remains the local harness record; the archival docs
themselves add no runtime boundary. Roll back this documentation closure by
restoring the active change directory and previous main specs; preserve the
deployed worker, memory records, and storage independently.
