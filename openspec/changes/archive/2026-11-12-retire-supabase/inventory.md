# Supabase Retirement Inventory

Path-based inventory from the pre-deletion recheck (2026-11-12). Every listed caller was rechecked
against the checkout; supported consumers use current contracts.

## Legacy runtime entry points (frontend origin)

| Path | Consumers found | Replacement used by current consumers |
| --- | --- | --- |
| `apps/web-app/src/app/api/memories/route.ts` (+ `route.test.ts`) | Only its own test; no UI/client code posts here | `POST /api/memories` on the Nest origin via `src/lib/axios/api.ts` (`create-memory-request.ts`) |
| `apps/web-app/src/app/api/memories/uploads/route.ts` | None (no test) | `POST /api/files/uploads` on the Nest origin (`use-create-memory-form.ts` preparation flow) |
| `apps/web-app/src/app/api/memories/[memoryId]/photos/[photoId]/[variant]/route.ts` (+ test) | Only its own test | Signed `coverUrl`/`detailUrl`/`previewUrl` values returned by Nest detail/edit reads |

## Isolated legacy helpers (delete with the routes)

`apps/web-app/src/features/memories/server/`:

- `create-memory.ts` (+ `create-memory.test.ts`) — imports `memory-input-validation`,
  `memory-upload-grant`, `memory-upload-storage`; used only by the two legacy write routes.
- `memory-input-validation.ts` — used only by `create-memory.ts`.
- `memory-upload-grant.ts` (+ test) — used only by `create-memory.ts`.
- `memory-upload-storage.ts` (no test) — used only by `create-memory.ts`.
- `create-memory-photo-variants.ts` (+ test) — used only by `memory-input-validation.ts`.
- `get-memory-photo.ts` (+ test) — photo route and `get-cover-preview-url.ts`.
- `get-available-memory.ts` (+ test) — `get-memory-photo.ts` and `get-cover-preview-url.ts`.
- `get-cover-preview-url.ts` (+ test) — used only by `get-related-memories.ts`.
- `get-related-memories.ts` (+ test) — used only by `get-related-vault-memories.ts`.
- `get-related-vault-memories.ts` (no test) — no importers (dead before this change).
- `can-mutate-comment.ts` (no test) — no importers (dead before this change).

`apps/web-app/src/features/space-setup/server/`:

- `has-active-space-for-user.ts` (+ test) — no importers (dead before this change).
- `sync-current-user.ts` (+ test) — no importers (dead before this change).

`apps/web-app/src/lib/`:

- `private-resource-response.ts` — used only by the legacy photo route.
- `supabase/admin.ts`, `supabase/client.ts`, `supabase/server.ts` — the three Supabase clients;
  all importers live in the legacy graph above.

## Retained shared/current helpers (not touched)

- `features/memories/server/get-current-memory-detail.ts` (+ test) — detail pages, revalidation.
- `features/memories/server/get-memory-for-editing.ts` (+ test) — memory and vault edit pages.
- `features/memories/server/revalidate-placement-views.ts` (+ test) — placement action, edit form.
- `features/space-setup/server/get-active-space-for-user.ts` (+ test) and
  `get-active-space-or-redirect.ts` (+ test) — application layout; `space-invite-result.ts`.
- `lib/server-logger.ts` (+ test) — Better Auth proxy route and legacy routes; retained with the proxy.
- `app/api/auth/[...path]/route.ts` — Better Auth proxy, unrelated to Supabase.
- `features/memories/components/memory-detail-view` related memories come from the Nest detail
  response (`memory.relatedMemories`), not from the frontend reader chain.

## Environment declarations

- `apps/web-app/src/constants/environment-variables.ts`: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (legacy-only consumers).
- `apps/web-app/src/environment.d.ts`: the two `NEXT_PUBLIC_SUPABASE_*` declarations.
- `apps/web-app/.env.example`: the three Supabase values (tracked template).

## Dependencies

- `apps/web-app/package.json`: `@supabase/ssr`, `@supabase/supabase-js`.
- `pnpm-lock.yaml` transitive entries, regenerated with pnpm.

## SQL/RPC/storage assets

Tracked (remove):

- `supabase/.env.example`, `supabase/README.md`, `supabase/config.toml`
- `supabase/migrations/20260915000000_database_schema.sql`,
  `20260918000000_uuid_v7_ids.sql`, `20260918195000_simplify_memory_comment_identity.sql`,
  `20260919030000_ignore_completed_memory_cleanup.sql`
- `supabase/tests/authorization-matrix.md`

Ignored/untracked (leave untouched): `supabase/.env.local`, `supabase/.temp/`,
`supabase/.branches/`, `supabase/snippets/`. `.gitignore` lines for `supabase/.temp/`,
`supabase/snippets/`, `supabase/.branches/` become obsolete and are removed.

Current database source of truth: `packages/database` (Prisma schema, migrations, generated
client). Supabase SQL is never executed against the current database.

## Documentation touched by removal

- `apps/api/README.md` — two obsolete "Supabase-backed endpoints" claims (2.5).
- `docs/architecture/database-schema/README.md` — points at the removed Supabase migration as the
  runtime source of truth (3.4).
- `docs/architecture/database-schema/implementation-plan.md` — Supabase-era upload grant wording (3.4).
- `docs/backlog/epics/complete-supabase-migration/` — `retire-supabase.md` (1.3), epic README
  dependency wording (3.4), `implement-file-cleanup.md` external-job note stays accurate.

## External unknowns (operator checks, not repository evidence)

- Deployed legacy callers and request traffic to the frontend legacy routes.
- External Supabase jobs/cleanup workers/schedules/webhooks and their credentials.
- Hosted project, storage, and backups (disposable; deletion is an operator action after verification).
- Repository SQL/RPC bookkeeping (`resource_cleanup`, cleanup RPCs) does not prove a deployed
  cleanup worker; deployment configuration must be inspected separately.

## Post-removal sweep classification (task 4.1)

Tracked runtime, manifests, lockfile, templates, CI, and infrastructure were searched after removal.
No runtime Supabase import, package entry, lockfile entry, route handler, or credential survives.

Remaining tracked mentions, all historical or intentional:

- `openspec/changes/archive/**` — delivery history; retained per design.
- `openspec/specs/**` — current main specs: no-fallback requirements are intentional; the
  `memory-lifecycle` legacy-RPC wording is replaced when this change's delta is applied at archive.
- `openspec/changes/retire-supabase/**` — this change's own artifacts.
- `docs/backlog/**`, `docs/architecture/database-schema/**` — backlog/epic records and historical
  baseline documentation, updated where they described current state.
- `apps/api/README.md` — the intentional retirement statement.

No env file in the checkout declares Supabase (`apps/web-app/.env.example` cleaned). The local
Supabase Docker stack (containers, volumes, network) was removed; hosted-project shutdown remains an
external operator action.
