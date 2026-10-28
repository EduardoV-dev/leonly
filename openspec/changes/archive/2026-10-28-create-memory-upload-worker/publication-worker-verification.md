# Sections 5 and 6 implementation evidence

Historical section-5/6 snapshot. For the delivered scope and final task status,
see `verification.md`. The operator CLI described below was subsequently removed
at the user's request; only bounded shared publication remains. Section 7 later
added deployment infrastructure and automatic local Lambda execution. Current
queue configuration uses `AWS_REGION`, `SQS_ENDPOINT`, and `SQS_QUEUES_URLS` as
documented in `apps/api/README.md`; the former names below are historical.

Sections 5 and 6 are complete: 22/34 tasks. The user approved `apps/workers` before implementation. Infrastructure sizing, queue redrive/event-source settings, production Sharp packaging, and local polling remain section 7 work.

## Implemented behavior

| Boundary | Outcome |
|---|---|
| Post-commit publication | Creation returns success after commit even when queue sends, lookup, or bookkeeping fail. Stable per-image event IDs and envelopes survive replay. |
| Manual replay | Operator CLI selects unpublished IDs or a bounded oldest-first limit, caps selection at 100, reports deferred work, and uses the same publisher as creation. |
| Independent worker | `apps/workers` compiles reused generated Prisma/storage source and consumes the shared event subpath without API/Nest bootstrap, Next.js, Supabase, or Redis. |
| Ownership and readiness | Authoritative metadata checks precede storage access. A 300-second CAS lease fences metadata by token/recipe; accepted outputs use create-only writes and verified ready metadata. Completion requires both variants. |
| Retry isolation | Duplicate completed events acknowledge without storage work; interrupted output/bookkeeping resumes; stale ownership cannot commit or clear replacement leases. Permanent and transient diagnostics accompany per-record SQS failures. |

Publication has a three-second selection/send budget, one SDK attempt, and bounded bookkeeping transactions with a one-second PostgreSQL statement timeout. Budget exhaustion reports untouched events as deferred. A send acknowledged before bookkeeping fails can be replayed with the same identity. No automatic reconciliation is promised.

## Verification

Results below record the original implementation verification. Publication and worker tests have since moved into their owning apps; focused commands reflect their current locations.

| Command or harness | Result |
|---|---|
| `pnpm --filter api exec vitest run src/common/outbox/outbox-publication.test.ts` and `pnpm --filter workers test:run` | Passed at original verification, 25 final behavioral checks: 8 publication and 17 worker checks |
| `pnpm --filter api check`, `typecheck`, `test:run`, `build` | Passed, 183 API tests and 27 existing utility tests |
| `pnpm --filter workers check`, `typecheck`, `test:run`, `build` | Passed; final worker checks also ran in the focused command above |
| `pnpm --filter web-app typecheck`, `test:run`, `build` | Passed; full suite ran 671 tests, followed by final focused checks after four additional cases and a worker metadata guard |
| `pnpm --filter web-app check` | Same 19 existing `noNestedTernary` errors documented in the preceding implementation evidence |
| Built worker handler with an empty SQS batch | Passed; returned no failures and loaded no Nest, Next.js, or Supabase runtime modules |
| Built operator CLI with `--limit 101` and `--id not-a-uuid` | Passed; both rejected with exit code 1 before publication |
| `openspec validate create-memory-upload-worker --strict`, staged/unstaged Git whitespace checks | Passed |

The first API suite run exposed missing SQS test startup values in the shared Vitest environment; those values are now configured. The first combined web verification exceeded the tool timeout during the build; a standalone build with a longer timeout passed. Behavioral tests use controlled database/storage/queue boundaries in the API and worker suites, not database integration tests.

## Review and rollback units

The aggregate implementation exceeds one 400-line review slice and remains uncommitted. Keep these behavior units together when preparing review:

1. Shared event contract, bounded publisher and operator replay, including publication/replay checks and CLI documentation.
2. Post-commit creation integration, including transaction-return event IDs, startup configuration, and creation success/rollback checks.
3. Worker ownership/readiness, Sharp recipe and batch handling, including dependency-boundary and interruption checks.

Runtime processing evidence uses real Sharp with controlled I/O; live queue-to-Lambda delivery and end-to-end persisted outcomes remain sections 7 and 9. The built-handler probe verifies module loading and the SQS response shape, not live database/storage processing.

Rollback boundaries: disable publication before removing the API publisher/replay integration; pause the event source before removing `apps/workers`. Remove the shared event export only after both consumers are removed. Preserve memory/upload/outbox/object rows and all accepted storage objects.

## Remaining boundaries

Live R2 verification remains deferred as previously approved. No queue/DLQ, event-source mapping, Lambda deployment image, read migration, creation-client switch, scheduled publisher, cleanup job, or R2 lifecycle rule was added. The API now requires `SQS_QUEUE_URL` and `SQS_REGION` at startup; credentials default to the AWS execution role, with paired overrides for local execution.
