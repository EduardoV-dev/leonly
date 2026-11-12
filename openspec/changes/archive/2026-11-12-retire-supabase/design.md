# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. Initial repository inspection found three
legacy Next.js memory routes, isolated Supabase-backed memory and space-setup helpers, three client
factories, two direct dependencies, environment declarations, and tracked SQL/setup assets.
The current creation request uses the configured Nest origin; current readers use signed storage
URLs. Import searches found no current UI consumer of the legacy helper graph. Implementation must
reconfirm that inventory against the then-current checkout before deleting files.

The owner explicitly confirmed there is nothing in Supabase to preserve. Hosted resources and jobs
were not inspected. Repository SQL contains legacy cleanup bookkeeping/RPCs, which does not prove a
cleanup worker or schedule is deployed. Current cleanup and event recovery are separate backlog items.

## Goals / Non-Goals

**Goals:** Remove the legacy dependency graph completely, keep current contracts intact, and make
repository readiness independently verifiable from hosted shutdown.

**Non-Goals:** Legacy imports, exports, backups, schema conversion, new compatibility endpoints,
current-storage cleanup implementation, event recovery, and automatic hosted resource deletion.

## Decisions

### Delete obsolete entry points rather than reimplement them

Remove the frontend-origin creation, upload-preparation, and photo handlers after checking all callers.
Their payloads, sessions, and persistence belong to a retired system. Redirects or proxy shims would
preserve unsupported contracts and risk routing legacy identities or grants into current writes.
Keep Nest's `/api/memories` route: its identical pathname is distinguished by the configured origin.
Keep the Next.js Better Auth proxy, which is unrelated to Supabase.

### Prune by reachability, not directory name

Inventory every import and public entry point before removal. Candidate legacy-only modules include
creation/grant/storage/variant helpers, available-memory/photo/cover/related readers, comment permission
checks, user sync, and active-space checks. Delete their exclusive tests with them. Retain helpers
under the same directories that serve current detail, editing, validation, or view revalidation.
Update legacy photo URLs in retained UI fixtures to representative current signed URLs.

Remove the three Supabase clients and both packages only after their caller graph is gone. Regenerate
the lockfile with pnpm rather than editing transitive package entries manually. Prune other packages
only if proven exclusive to the removed code; do not extend this into a general dependency cleanup.

### Remove operational assets while retaining history

Remove tracked Supabase setup, migrations, test matrices, and credential declarations. Update API,
architecture, and backlog docs to describe the current runtime accurately. Historical archived
OpenSpec changes and meaningful requirements forbidding legacy fallback remain useful records;
retirement does not require erasing every occurrence of the word Supabase.

Do not read or delete ignored local secrets, CLI caches, or local volumes as incidental cleanup.
Document local residue for the operator instead. Do not execute legacy SQL against the current
database or change its Prisma migration history.

### Separate repository readiness from irreversible shutdown

The no-preservation decision removes legacy-data migration and backup gates. It does not establish
that deployed clients, external jobs, or credentials have already been retired. Record these as
operator checks, with evidence and pending status, rather than marking them complete from source
inspection. Inventory any external cleanup integration and disable it; do not port it to the current
dataset or make retirement depend on implementing the separate current cleanup/recovery backlog.

## Risks / Trade-offs

- Unknown deployed legacy callers → check deployment configuration and request traffic before shutdown;
  migrate a supported remaining consumer to existing current contracts if one is discovered.
- Over-deleting shared helpers → use import/caller checks and current-journey tests, not name matching.
- Dependency removal changes bundling → run all four web gates with Supabase variables absent.
- Hosted deletion prevents legacy rollback → retain resources through deployment verification and
  explicitly record the irreversible boundary before revocation/deletion.
- Local checks cannot prove cloud retirement → keep deployment, external-job, and hosted-deletion
  evidence separate from successful repository validation.

## Migration Plan

1. Reconfirm callers, route exposure, dependencies, credential references, SQL/storage assets, and
   external integration ownership. Complete repository cleanup and document all operator-only checks.
2. Run web `check`, `typecheck`, `test:run`, and `build` without Supabase environment variables. Add no
   deletion-mirroring tests; use retained behavioral coverage and focused checks of route removal.
   Search tracked runtime/config files and classify remaining mentions as historical or intentional.
3. Deploy the Supabase-free application using current-backend configuration. Verify sign-in/out,
   create/join/onboarding/settings, Timeline/Vault/detail, create/edit/place/delete, comments/replies/
   reactions, and upload-to-ready image processing. Record unavailable verification as pending.
4. Before shutdown, verify no live caller or job requires Supabase, disable external legacy jobs and
   integrations, and confirm current jobs use their own credentials/resources. If verification fails,
   restore the preceding compatible deployment while the legacy resources/configuration still exist;
   do not redirect current-backend records to Supabase or roll back current database state.
5. After verification, remove Supabase deployment credentials, revoke keys, and have the operator
   delete the disposable hosted project/storage/backups. Record completion evidence. After this
   boundary, recovery is a Supabase-independent fix or compatible deployment; Supabase-dependent
   releases are no longer valid rollback targets.

Implementation must leave deployment-only steps unchecked until their evidence exists. Update the
backlog to link this change and record the no-preservation decision without claiming cloud shutdown.
