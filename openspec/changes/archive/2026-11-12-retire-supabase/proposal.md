# Proposal

## Why

Current user journeys have moved to NestJS, Prisma, Better Auth, and private object storage, but
obsolete Next.js routes and isolated helpers still retain Supabase credentials and dependencies.
Retire that second backend now; the owner has confirmed that no legacy data needs preservation.

## What Changes

- **BREAKING** Remove the frontend-origin legacy `POST /api/memories`,
  `POST /api/memories/uploads`, and `GET /api/memories/:memoryId/photos/:photoId/:variant`
  handlers after verifying all current consumers use their existing replacements.
- Remove Supabase-only helpers, tests, clients, dependencies, environment declarations, and tracked
  local setup/schema assets. Preserve current-backend code and historical change records.
- Verify supported journeys without Supabase configuration and update operational documentation.
- Record an ordered deployment, rollback, credential-removal, and hosted-project shutdown procedure.
  No legacy import, export, or backup is required by this retirement.

## Capabilities

### New Capabilities

- `supabase-independence`: Operation without Supabase configuration, explicit legacy-data disposition,
  and staged external retirement.

### Modified Capabilities

- `api-endpoints`: Retire the legacy image endpoint and explicitly remove frontend-origin legacy
  creation/upload handlers while retaining current NestJS contracts.
- `memory-lifecycle`: End the legacy Supabase lookup RPC compatibility obligation while preserving
  current UUID and authenticated-user contracts.

## Impact

- Web app legacy API routes, memory and space-setup server helpers, clients, environment types,
  package manifest, lockfile, and legacy URL fixtures.
- Tracked `supabase/` setup and migrations, architecture/API/backlog documentation, and deployment
  configuration maintained outside this repository.
- Hosted Supabase users, spaces, memories, social data, media, and backups are disposable. Hosted
  deletion is a separate operator action after verification, not an effect of applying code changes.
- Current-storage cleanup and unpublished-event recovery remain separate backlog work; this change
  neither implements them nor claims they are already deployed.
