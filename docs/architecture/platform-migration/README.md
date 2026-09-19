# Target Platform Architecture

Leonly will stop feature development while it moves from the integrated Supabase backend to a
provider-separated architecture. The migration must preserve current behavior and data before any
new product work resumes.

## Target stack

| Concern | Target | Boundary |
| --- | --- | --- |
| Frontend | Next.js | Rendering and browser interaction only; no direct database, cache, or object-storage access. |
| Backend | NestJS | Sole owner of business APIs, authorization, validation, persistence, and storage grants. |
| Database | Neon Postgres | Source of truth for relational state, constraints, transactions, and RLS. |
| Cache | Upstash Redis | Disposable cache only; never authoritative state. |
| Object storage | Cloudflare R2 | Private storage for originals and derived memory assets. |
| CDN and edge | Cloudflare | Routes traffic and serves authorized immutable media without exposing the bucket. |
| Background work | Undecided | Executes idempotent jobs behind a provider-neutral job contract. |

Authentication and job execution technology are intentionally undecided. They are migration gates,
not reasons to create speculative adapters now.

## Migration governance

`migration-plan.md` defines the mandatory approval process for this program. No implementation
choice proceeds without the user's prior decision and explicit approval. Every review checkpoint is
recorded under `checkpoints/` before the next batch begins.

## Request flow

```text
Browser
  ├── Next.js frontend
  └── NestJS API
        ├── Neon Postgres
        ├── Upstash Redis
        ├── Cloudflare R2
        └── Job producer → worker runtime (to be selected)

Cloudflare
  ├── DNS, TLS, routing, and CDN
  └── Authorized media delivery from private R2 objects
```

Next.js may call NestJS during server rendering, and browser interactions may call it directly. In
both cases, NestJS remains the business boundary. A same-origin route or explicit API origin may be
chosen during deployment design; business logic must not return to Next.js route handlers.

## Core decisions

### Authorization and RLS

Keep PostgreSQL RLS as defense in depth. NestJS verifies the authenticated identity and runs each
user-scoped database operation in a transaction that sets a transaction-local identity value. RLS
helpers resolve that value to `public.users.id`.

- Runtime queries use a restricted role without `BYPASSRLS`.
- Migration and operational roles are separate from the runtime role.
- Connection pooling must never retain identity between requests.
- `SET LOCAL` or `set_config(..., true)` and the protected query run in the same transaction.
- Supabase-specific `auth.uid()`, `authenticated`, and `service_role` contracts are replaced before
  Neon receives production traffic.

### API ownership

NestJS modules follow product capabilities: identity, spaces, memories, comments, reactions,
storage, and cleanup. Controllers expose transport contracts; domain and persistence behavior stay
inside the owning module. Do not introduce generic repositories or a shared package until a real
second consumer requires them.

The backend publishes an OpenAPI contract. The frontend consumes that contract rather than sharing
NestJS implementation types.

### Object storage and media delivery

R2 remains private. Existing object keys are preserved so `memory_asset_objects.object_path` does
not need a data rewrite.

1. NestJS authorizes an upload or read against Neon.
2. NestJS issues a short-lived capability or an authorized Cloudflare Worker serves the object.
3. The browser never receives R2 credentials.
4. Cloudflare may cache immutable variants only after authorization succeeds.

Cache keys must not vary on secrets, and an authenticated response must never become publicly
readable. Original uploads remain private and are not CDN assets.

### Caching

Upstash Redis uses cache-aside behavior with explicit TTLs and versioned key prefixes. Neon remains
the source of truth.

- Start the migrated system with caching disabled.
- Add caches only to measured read paths after parity is proven.
- Include tenant or space identity in every user-data cache key.
- Invalidate affected keys after successful database commits.
- Never cache authorization decisions, mutation results, or long-lived signed URLs.
- Cache failures fall back to Neon; they do not fail the user operation.

### Background jobs

The first required background workload is resource cleanup, replacing the current Vercel cron.
Photo variant generation may move from synchronous Sharp processing to a Node-capable worker after
the job runtime is selected.

Every job system must provide:

- at-least-once delivery with idempotent handlers;
- bounded retries and backoff;
- dead-letter handling;
- scheduling for cleanup work;
- concurrency controls;
- structured logs, correlation IDs, and operational metrics;
- a Node runtime when native Sharp processing is required.

Cloudflare Queues, Upstash QStash or Workflow, and a dedicated Node worker remain candidates. Select
one only after testing payload limits, retry semantics, runtime compatibility, cost, and local
development. Redis is not automatically the job queue merely because it is already used for cache.

## Repository direction

```text
apps/
  web-app/       # Next.js frontend
  api/           # NestJS backend
  worker/        # Add only after the worker runtime is selected
database/
  migrations/    # Provider-neutral, forward-only PostgreSQL migrations
docs/
  architecture/
```

Existing applied Supabase migrations remain immutable. Provider-neutral migrations begin at an
explicit cutover boundary; they do not rewrite deployed history.

## Decisions required before implementation

| Decision | Required before | Acceptance criteria |
| --- | --- | --- |
| Authentication provider and account-linking rule | NestJS auth implementation | Verifiable JWT/session, stable subject, logout and refresh behavior, safe mapping to existing users. |
| PostgreSQL driver and migration runner | Neon foundation | Transactions, pooled runtime connections, direct migration connection, UUID and custom type support. |
| NestJS deployment runtime | API deployment | Node compatibility, graceful shutdown, health checks, regional latency, secret management. |
| Job platform | Cleanup cutover | Required delivery, retry, scheduling, dead-letter, observability, and Sharp runtime behavior. |
| Private media delivery model | R2 cutover | Authorization on every grant/request, bounded lifetime, safe CDN cache key, revocation behavior. |

## Explicit non-goals

- No product features during the migration program.
- No database redesign unrelated to provider removal.
- No cache added before performance evidence.
- No public R2 bucket for private memories.
- No dual-write system unless measured cutover constraints make a maintenance window impossible.
- No speculative worker framework before the job-runtime decision.

## References

- [Neon: migrate from Supabase](https://neon.com/docs/import/migrate-from-supabase)
- [Neon: RLS query execution](https://neon.com/docs/guides/rls-query-execution)
- [NestJS lifecycle events](https://docs.nestjs.com/fundamentals/lifecycle-events)
- [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi)
- [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Cloudflare Queues](https://developers.cloudflare.com/queues/)
