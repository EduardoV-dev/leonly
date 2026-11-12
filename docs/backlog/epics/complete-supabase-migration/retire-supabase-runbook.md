# Supabase Retirement Runbook

Operational procedure for retiring the legacy Supabase backend. Repository completion is separate
from hosted decommissioning; no step below is complete without recorded evidence.

OpenSpec change: [retire-supabase](../../../../openspec/changes/retire-supabase/proposal.md)
(inventory: `inventory.md`). Backlog item: [retire-supabase.md](retire-supabase.md).

## Decided dispositions

- **No preservation.** The owner confirmed hosted legacy users, spaces, memories, social data,
  media, and backups are disposable. No import, export, identity mapping, or backup is required.
- **Current data is protected.** The disposition does not authorize deleting current-backend
  PostgreSQL records, private storage objects, queues, or worker resources.
- **Deferred current capabilities.** Current-storage cleanup and unpublished-image-event recovery
  are separate outstanding backlog work ([implement-file-cleanup.md](implement-file-cleanup.md),
  [recover-unpublished-image-events.md](recover-unpublished-image-events.md)). Disabling legacy
  Supabase cleanup does not migrate, replace, or verify them; they have no implemented schedules yet.

## External job and credential inventory (operator evidence required)

Record each row's status and evidence date before shutdown. Repository inspection cannot complete
these entries.

| Item | Where to check | Status | Evidence |
| --- | --- | --- | --- |
| Legacy route request traffic on the frontend deployment | Deployment logs/monitoring for `POST /api/memories`, `POST /api/memories/uploads`, `GET /api/memories/:memoryId/photos/:photoId/:variant` | Pending | |
| Scheduled cleanup functions, edge workers, or cron in the hosted project | Supabase dashboard: Edge Functions, pg_cron schedules, extensions | Pending | |
| Webhooks or integrations registered on the hosted project | Supabase dashboard: webhooks, auth providers (Google OAuth), project settings | Pending | |
| Deployment environment variables/credentials referencing Supabase | Hosting provider environment configuration (frontend deployment) | Pending | |
| OAuth callback registration tied to Supabase auth | Google Cloud console authorized redirect URIs; Better Auth now owns callbacks | Pending | |
| Consumers of the legacy Supabase RPC lookup contracts | Hosted project database client list/traffic | Pending | |

## Repository status notes

- `apps/web-app/.env.example` no longer declares any `SUPABASE_*` value; runtime/build configuration
  uses only current-backend variables (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_BASE_URL`, Sentry
  values). No env file in the checkout declares Supabase.
- The local Supabase Docker stack was removed: 12 containers (including the stale edge runtime), the
  `supabase_db_leonly`/`supabase_edge_runtime_leonly`/`supabase_storage_leonly` volumes, and the
  `supabase_network_leonly` network. Current-backend containers (`api-postgres-1`, `api-redis-1`,
  `api-floci-1`) are unaffected.

## Deployment verification checklist (evidence required before shutdown)

Deploy the Supabase-free application with only current-backend configuration and record each check.

| # | Check | Expected | Status | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Build and start without Supabase variables | No Supabase URL/key/service-role values present; app serves | Pending | |
| 2 | Sign-in and sign-out | Better Auth session flow works through `/api/auth/*` proxy | Pending | |
| 3 | Create space, join space, onboarding, settings writes | Nest endpoints respond per documented contracts | Pending | |
| 4 | Timeline and shared Private Vault reads, memory detail | Signed storage URLs render directly; no request to `/api/memories/:memoryId/photos/...` | Pending | |
| 5 | Create memory with photo upload | `POST /api/files/uploads` + `POST /api/memories` on the Nest origin; legacy frontend routes return 404/no handler | Pending | |
| 6 | Edit memory, placement move, delete | Version-checked save; placement changes propagate | Pending | |
| 7 | Comments, replies, reactions | Nest contracts unchanged | Pending | |
| 8 | Upload-to-ready image processing | Worker generates variants; signed reads serve them | Pending | |

## Rollback boundary

- Before credential revocation: if verification fails, redeploy the preceding compatible
  application release while Supabase resources and credentials still exist. Do not redirect
  current-backend records to Supabase and do not restore current database state from Supabase.
- After credential revocation or hosted project deletion: rollback to any Supabase-dependent
  release is no longer supported. Recovery must be a Supabase-independent fix or a compatible
  Supabase-free deployment. Record this decision at the boundary below.

## Shutdown sequence (operator-only, after all checks above)

1. [ ] Record the pre-shutdown rollback decision and every checklist row's evidence.
2. [ ] Confirm no live caller or scheduled job requires Supabase (inventory rows closed).
3. [ ] Remove Supabase deployment credentials from the hosting provider configuration.
4. [ ] Revoke Supabase keys in the hosted project.
5. [ ] Operator deletes the disposable hosted project, storage, and backups.
6. [ ] Record resource-specific completion (project, database, storage, auth, each backup target).
7. [ ] Confirm current PostgreSQL, private storage, queue, and worker resources are unaffected.
