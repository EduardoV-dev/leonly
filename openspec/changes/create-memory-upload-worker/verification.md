# Sections 1 and 2 review handoff

This is the historical sections 1 and 2 baseline. Current sections 3 and 4 evidence is in `implementation-verification.md`.

Tasks 1.1, 1.2, and 2.1–2.3 were complete at this handoff. Task 1.3 remained pending for live R2 verification, explicitly deferred by the user. Implementation stopped here for review at that point.

## Review order

1. `contracts.md`: existing boundaries, JSON contracts, and approved timings.
2. `apps/api/prisma/schema.prisma`: five new persistence models; existing identity/space models gain relations only.
3. `apps/api/prisma/migrations/20261011004000_memory_creation/migration.sql`: additive tables, constraints, indexes, and triggers.
4. `provider-feasibility.md`: local storage evidence and live R2 gap.

The persistence work is one additive migration unit; contract/provider notes are a separate review unit. Schema and migration are below the 400-line authored-file limit. No commits were requested or created.

## Migration and integrity evidence

All three checked-in migrations applied successfully to a separate local PostgreSQL 18 database named `leonly_memory_schema_check_20261011`, on port 5434. Prisma comparison of that database against the schema reported **no difference**. The application database was not migrated; `public.memories` remains absent there.

Prisma validates and generates the new client. The SQL migration additionally owns CHECK constraints, the immutable-creation trigger, timestamp triggers, and the partial unpublished-event index; Prisma's schema comparison does not establish those custom SQL invariants.

A one-off, transaction-rolled-back diagnostic in `/tmp/opencode/leonly-memory-integrity-check.sql` exercised valid memory/asset/object/outbox insertion and rejected:

| Integrity group | Verified rejections |
|---|---|
| Tenant and creator | Wrong creator membership space, cross-space asset memory/upload, cover from another memory |
| Exclusive identities | Duplicate scoped creation key after soft deletion, reused upload, duplicate asset position |
| Object integrity | Duplicate variant, duplicate final path, ready object without metadata, zero-byte ready original |
| Lifecycle and publication | Negative asset position, memory upload without space, incomplete lease pair, negative publication attempts |
| Creation stability | Updating the persisted creation hash |

The same diagnostic checked the partial unpublished-event index and accepted a non-UUID generic aggregate ID. Fixture writes rolled back; the separate verification database remains available. No database integration test suite was added.

Re-run the Prisma drift check against that local verification database:

```bash
DATABASE_URL=postgresql://leonly:leonly@localhost:5434/leonly_memory_schema_check_20261011 \
  pnpm --filter api exec prisma migrate diff \
  --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

The local credentials above are the existing Docker Compose development defaults. This command does not migrate the application database.

## Required checks

| Check | Result |
|---|---|
| Prisma validate / generation / migration deploy / drift check | Passed |
| API check / typecheck / test:run / build | Passed; 183 API tests, plus shared utility tests |
| Web typecheck / test:run / build | Passed; 580 web tests |
| Web check | Failed on 19 existing `noNestedTernary` violations in unchanged frontend files |
| OpenSpec strict validation / Git whitespace check | Passed |

Frontend lint failures occur in existing memory components/hooks/pages, partner-invite status, and `vitest.setup.ts`. No frontend source changed in this slice. These failures are recorded rather than included in the persistence work.

## Scope and rollback boundary

No upload/creation endpoint or worker runtime is implemented yet, so an application-level upload-to-worker harness is not applicable to this slice. Floci primitive checks and database migration/integrity diagnostics provide the available runtime evidence. Live R2 compatibility remains unverified.

Before deployment, the schema additions and new migration can be reverted together without changing existing user/space behavior. After deployment, disable new creation traffic and preserve the additive schema/records; do not drop tables or storage objects as rollback. Sections 3–9 remain pending.
