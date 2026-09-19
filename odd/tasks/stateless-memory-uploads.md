# Stateless Memory Uploads

## Objective

Keep browser-direct uploads to Supabase Storage while removing the durable
`memory_attempts` and `memory_attempt_assets` workflow tables.

## Problem

The current upload path persists a multi-step attempt state machine in PostgreSQL even though
the application completes image processing synchronously. Abandoned and failed attempts are not
reliably converted into cleanup work, so the extra state does not currently guarantee cleanup.

## Why

A short-lived signed upload capability can authorize direct uploads without durable attempt rows.
Finalization can validate uploaded bytes, process variants, and atomically create or edit the memory.

## Scope

- Replace attempt preparation with signed Storage upload URLs and a stateless server-signed grant.
- Finalize create/edit operations with deterministic memory, asset, and mutation identifiers.
- Remove attempt schema, functions, policies, TypeScript orchestration, and tests.
- Preserve deferred cleanup for obsolete and abandoned Storage objects.
- Update architecture documentation and migration assertions.

## Constraints

- Original photos must continue uploading directly from the browser to Supabase Storage.
- Uploaded bytes remain untrusted until server-side validation succeeds.
- Database finalization must remain atomic and edit conflicts must remain explicit.
- No new runtime dependency unless the platform or existing dependencies cannot provide the capability.
- Do not create or modify tests that inspect migration scripts; validate SQL transactionally instead.
- Keep implementation and technical artifacts in English.

## Authorized scope

- `apps/web-app/src/app/api/memories/**`
- `apps/web-app/src/features/memories/**`
- `apps/web-app/src/lib/supabase/**`
- `supabase/migrations/20260915000000_database_schema.sql`
- `docs/architecture/database-schema/**`
- Tests directly covering the changed behavior

## Delivery

- Strategy: `exception-ok`
- Forecast: approximately 900 authored changed lines.
- Size exception: accepted by the user on 2026-09-18 because splitting SMU-1 would break the
  functional API, Storage, and SQL contract.
- TDD: disabled (not explicitly enabled); tests remain mandatory.
- Test runner: `pnpm --filter web-app test:run`

## Tasks

- [x] **SMU-1 — Move memory creation to stateless signed uploads**
  - Replace create-attempt preparation with authenticated, short-lived signed upload authorization.
  - Bind operation, actor, space, target memory/version, asset IDs, object paths, and expiry.
  - Finalize creation from the verified grant without writing attempt rows.
  - Acceptance: creation uses signed URLs, direct uploads, and deterministic retry-safe identifiers;
    tampered or expired grants fail.
  - Checks: focused grant, create-route, browser-upload, and creation tests; typecheck.

- [x] **SMU-2 — Move memory editing and schema off attempt rows**
  - Apply the stateless grant flow to edits and atomically persist retained/new asset selection.
  - Preserve deterministic retries, edit conflicts, photo ordering, and cover selection.
  - Remove attempt TypeScript orchestration, database objects, policies, and grants.
  - Acceptance: create/edit behavior and retry semantics pass with no attempt tables.
  - Checks: focused server/API tests, baseline migration tests, typecheck.

- [x] **SMU-3 — Reconcile cleanup and documentation**
  - Queue known obsolete objects and sweep expired temporary uploads without attempt records.
  - Update schema documentation and architecture assertions.
  - Acceptance: successful, failed, and abandoned flows have a bounded cleanup path.
  - Checks: cleanup tests plus full check, typecheck, test, and build gates.

## Progress

- Current task: final verification and delivery
- Verification evidence:
  - Full Vitest: 96 files and 588 tests passed.
  - Typecheck, Biome check, and production build passed.
  - `git diff --check` passed.
  - SQL validation remains environment-blocked: no disposable local database was available without
    disrupting active PostgreSQL connections.
- Work-unit commits:
  - `9d54b22` — stateless signed memory creation uploads.
  - `b15d8f9` — stateless signed memory editing and attempt removal.
  - `eaf0dcb` — scheduled cleanup, temporary-object reaper, and schema documentation.
- Running authored changed lines: 1,481 for SMU-1; size exception accepted for the cohesive
  API, Storage, and SQL contract.

## Next step

Set `CRON_SECRET` in Vercel, then deploy the baseline through the normal Supabase reset workflow.
