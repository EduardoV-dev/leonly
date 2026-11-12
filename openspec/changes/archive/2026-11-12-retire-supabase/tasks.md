# Tasks

## 1. Confirm retirement boundaries

- [x] 1.1 Inventory tracked Supabase imports, entry points, environment declarations, dependencies, SQL/RPC/storage assets, and documented jobs; deliver a path-based inventory distinguishing live routes, isolated helpers, current replacements, and external unknowns.
- [x] 1.2 Recheck every legacy helper and route caller, including browser/server requests and generated photo URLs; verify supported consumers use current contracts and migrate any discovered remaining supported consumer before deleting its legacy path.
- [x] 1.3 Update `docs/backlog/epics/complete-supabase-migration/retire-supabase.md` to link this change and record that users, spaces, memories, social data, media, and backups need no preservation; verify no legacy-transfer prerequisite remains and external shutdown is still pending.

## 2. Remove legacy runtime entry points and their exclusive code

- [x] 2.1 Remove the three legacy Next.js memory creation/upload/photo routes and their exclusive tests; verify the route tree has no legacy handlers while the Better Auth proxy and Nest memory endpoints remain intact.
- [x] 2.2 Remove exclusively legacy memory helpers/tests for creation, grants, storage, variants, available-memory/photo/cover/related reads, and comment permissions; verify no unresolved imports and retain all shared/current detail, editing, validation, and revalidation helpers.
- [x] 2.3 Remove unused Supabase user-sync and active-space helpers/tests and all three Supabase clients; verify no runtime Supabase imports remain and current auth/space tests pass.
- [x] 2.4 Update retained UI photo fixtures to current signed-storage URL shapes and remove misleading Supabase-specific test wording where appropriate; run affected component/logger tests and verify existing privacy assertions remain effective.
- [x] 2.5 Update `apps/api/README.md` routing and policy descriptions to remove obsolete Supabase endpoint claims; verify the docs distinguish retired frontend paths from unchanged backend-origin memory operations.

## 3. Remove dependencies and operational setup

- [x] 3.1 Remove Supabase packages from the web manifest and regenerate `pnpm-lock.yaml` using pnpm; verify a frozen-lockfile install resolves without Supabase packages and remove any other dependency only after proving it exclusive to deleted code.
- [x] 3.2 Remove Supabase environment values/types and tracked template declarations, subject to file-access permissions; verify tracked runtime/build configuration needs only current-backend variables and document inaccessible or externally managed configuration as pending.
- [x] 3.3 Remove tracked Supabase configuration, schema migrations, setup docs, authorization matrix, and Supabase-specific ignore rules where obsolete; verify no current database migration or runtime asset was removed and leave ignored secrets/caches/volumes untouched.
- [x] 3.4 Update current architecture and backlog documentation and repair links affected by removal; verify the current database source of truth is accurate and archived OpenSpec records remain intact.
- [x] 3.5 Write the retirement runbook with the no-preservation decision, external job/credential inventory, deployment smoke checklist, rollback boundary, and shutdown evidence fields; verify current-storage cleanup/event recovery are documented as separate outstanding work and no cloud step is marked complete without evidence.

## 4. Verify repository independence

- [x] 4.1 Search tracked runtime, manifests, lockfile, templates, CI, and infrastructure for Supabase packages/credentials/legacy route consumers; record that remaining mentions are historical or intentional and verify no runtime fallback survives.
- [x] 4.2 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`, `pnpm --filter web-app test:run`, and `pnpm --filter web-app build` with Supabase configuration absent, accounting for automatically loaded env files; record each result and any verification blocker without exposing secrets.
- [x] 4.3 Verify supported current journeys with configured local integrations: sign-in/out, create/join/onboarding/settings, Timeline/Vault/detail, create/edit/place/delete, comments/replies/reactions, and upload-to-ready processing; verify retired frontend routes perform no legacy work and record unavailable live checks as pending.

Deployment and hosted shutdown are operator-owned actions outside repository scope; their ordered
procedure, evidence fields, and rollback boundary live in
`docs/backlog/epics/complete-supabase-migration/retire-supabase-runbook.md` and remain pending there.
