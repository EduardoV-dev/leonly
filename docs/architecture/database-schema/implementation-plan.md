# Database Schema Implementation Plan

The baseline migration is complete and is the runtime source of truth. This document records the
implemented contracts for future changes; it is not a migration runbook.

## Core contracts

| Area | Implemented contract |
| --- | --- |
| Identity and tenancy | Internal `users.id` is linked to `auth.users` by unique `auth_subject`. Active memberships enforce the space boundary and ownership cardinality. |
| Memories | Create and edit mutations use deterministic IDs and optimistic `memories.updated_at` checks. Create retries use the creator mutation; edit retries use the last edit mutation. |
| Upload grants | The server signs a short-lived create/edit grant binding actor, space, target memory/version, mutation, asset IDs, and exact paths. The browser uploads only temporary originals through Supabase signed upload URLs. |
| Permanent assets | Finalization validates untrusted bytes, creates permanent `memory_assets` and ready `memory_asset_objects`, then atomically publishes selection, ordering, and cover ownership. No attempt tables exist. |
| Cleanup | `resource_cleanup` is the generic deletion outbox. Service-role cleanup claims bounded leases with `FOR UPDATE SKIP LOCKED`, retries failures with backoff, and treats missing objects as deleted. |

## Storage lifecycle

1. A create or edit preparation endpoint returns a signed grant and exact temporary-original paths.
2. The browser uploads directly to private `memory-photos` storage.
3. The server verifies the grant, validates bytes, writes permanent original and derived paths, and
   finalizes the database mutation atomically.
4. Obsolete permanent paths and consumed temporary paths are queued in `resource_cleanup`.
5. The daily `/api/internal/resource-cleanup` cron, authenticated by `CRON_SECRET`, first enqueues a
   bounded batch of temporary-original paths older than the ten-minute grant plus a five-minute
   buffer, then processes cleanup leases.

The reaper matches only the exact temporary-original path shape. It cannot queue permanent memory
asset paths, and `claim_resource_cleanup` additionally excludes paths referenced by active memory
assets. Queue uniqueness, short leases, and `SKIP LOCKED` make duplicate or overlapping cron calls
safe.

## Security and privileges

- Application RPCs derive identity from the verified session and never accept membership, role, or
  space authority from callers.
- Security-definer functions use `search_path = ''` and schema-qualified references.
- Storage reads resolve only ready permanent objects through the active membership chain.
- The reaper and cleanup RPCs are executable only by `service_role`; `CRON_SECRET` is server-only and
  the route fails closed when it is absent or does not match its `Authorization` header.

## Verification

```bash
pnpm --filter web-app check
pnpm --filter web-app typecheck
pnpm --filter web-app test:run
pnpm --filter web-app build
```

When a local PostgreSQL runtime already exists, apply the baseline in a disposable transaction and
roll it back. Do not download a runtime merely to validate this baseline.
