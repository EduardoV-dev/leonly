# Sections 3 and 4 implementation evidence

This file records the sections 3 and 4 implementation at 14/34 tasks. Sections 5 and 6 were completed subsequently; see `publication-worker-verification.md` for their evidence. Live R2 verification (1.3) remains deferred with explicit user approval.

## Review units

| Unit | Implementation and behavioral evidence | Rollback boundary |
|---|---|---|
| Storage and issuance | `apps/api/src/common/storage`, `modules/files/files.*`, `upload-validation.ts`; API `upload-issuance.test.ts` and `storage-validation.test.ts` | Remove FilesModule registration, upload endpoints and storage configuration only when the memory endpoint is also disabled |
| Promotion and creation | `upload-finalization.service.ts`, `modules/memories`; API creation/finalization/normalization checks | Remove MemoriesModule registration and creation/finalization code together; preserve upload and additive persistence records |
| Test ownership | API behavioral tests are collocated with their owners and use the existing API Node/SWC harness | Remove tests with their owning behavior; frontend configuration no longer loads API source |

The units exceed a single 400-line review slice in aggregate and remain uncommitted. Each authored code file is below the 400-line limit. No commits or PRs were requested.

## Verified behavior

1. Upload issuance requires authentication/active membership, rejects forged authority and invalid descriptors, preserves order, persists both keys before signing, and returns exact 600-second capabilities with signed `Content-Type`.
2. Finalization uses 120-second compare-and-set claims, bounded downloads, conditional destination PUT, full final-pixel decoding, and token-fenced updates. Staging replacement, copy-before-bookkeeping interruption, expired claims, stale finalizers, and invalid immutable copies have regression coverage.
3. Canonical SHA-256 creation identity includes normalized details, ordered UUID uploads, cover, date/timezone, and visibility. Existing scoped results resolve before consumed uploads; changed input returns 409. Every retry checks active membership.
4. One transaction locks active membership/space and commits memory, ordered assets, same-memory cover, ready original/pending variants, consumed uploads, and one versioned outbox record per image. Controlled failures verify atomic rollback, winner lookup after rollback, lease contention, and photo-free creation.

Creation tests use controlled Prisma/storage boundaries, not a database integration suite. Direct service checks run without Redis. HTTP checks run the real Nest application and authentication guard with controlled authentication, database, and rate-limit dependencies.

## Checks

Results below record the original implementation verification. Backend tests have since moved out of the web suite; the focused command reflects their current location.

| Command or harness | Result |
|---|---|
| `pnpm --filter api exec vitest run src/modules/files src/modules/memories` | Passed at original verification: 68 tests |
| `pnpm --filter api check` / `typecheck` / `test:run` / `build` | Passed: 183 API tests and 27 utility tests |
| `pnpm --filter web-app typecheck` / `test:run` / `build` | Passed: 648 web tests |
| `pnpm --filter web-app check` | Same 19 pre-existing `noNestedTernary` errors; includes the unchanged image-source expression in the modified DOM setup file |
| Built storage/finalization probe against running Floci | Passed: signed PUT, immutable promotion/reuse, and 1-winner/7-existing concurrent writes; see `provider-feasibility.md` |
| OpenSpec strict validation / changed implementation Biome check / staged and unstaged Git whitespace checks | Passed |

The API now needs complete `STORAGE_*` configuration at startup. `apps/api/README.md` documents R2/local values and the separate browser signing endpoint. Upload expiry timestamps match SigV4's whole-second signing date.

## Test ownership cleanup verification

API tests now live beside the file, memory, and outbox modules. Image processing tests and their runner live in `apps/workers`; their fixtures reuse API creation fixtures to seed committed state. Test fixtures are excluded from production builds. The web app no longer needs API decorator transforms, backend test dependencies, or a Node environment exception.

| Check | Result |
|---|---|
| `pnpm --filter api test:run`, `check`, `typecheck`, `build` | Passed: 268 API tests and 27 utility tests |
| `pnpm --filter workers test:run`, `check`, `typecheck`, `build` | Passed: 17 worker tests |
| `pnpm --filter web-app test:run`, `typecheck`, `build` | Passed: 580 frontend tests |
| `pnpm --filter web-app check` | Same 19 pre-existing nested-ternary errors; modified configuration and setup formatting passed focused checks |
| Frozen offline install and Git whitespace check | Passed |

The existing HTTP and image-processing tests exercised the runtime boundaries with controlled I/O. No live provider or deployment verification was required for this relocation. Roll back the cleanup by moving tests and fixtures together, restoring runner configurations and dependency manifests, and reverting the ownership guidance; production behavior is unchanged.

## Remaining delivery boundaries

The application database was not migrated in this session. Deployment must apply the already checked-in migration before using these endpoints. The previous persistence verification is recorded in `verification.md`.

This slice persists unpublished events but does not send SQS messages, generate variants, switch the creation client, add reads, configure bucket CORS/deployment, or install cleanup. A committed original is ready; both generated variants are pending. No timeline visibility or live R2 compatibility is claimed.

Disable the new creation traffic before rolling back endpoint code, and preserve accepted originals, upload attribution, and additive persistence tables. Remove no storage objects or schema as rollback.
