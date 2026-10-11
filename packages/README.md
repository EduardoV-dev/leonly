# Shared packages

The workspace has two shared packages. API and workers use both; the web app uses browser-safe
utilities from `@leonly/utils`.

| Package | Owns |
| --- | --- |
| `@leonly/database` | Prisma schema, migrations, generated client, and PostgreSQL adapter configuration |
| `@leonly/utils` | Resilience helpers, invite codes, logging, event contracts, queue operations, and object storage |

## Utility modules

`utils/src` contains only `index.ts` and module folders. Each folder has an `index.ts` entry
point and collocated tests. Import through the package's public entry points:

| Import | Module folder | Exports |
| --- | --- | --- |
| `@leonly/utils` | `resilience/` via the root entry point | Retry, timeout, and circuit-breaker helpers |
| `@leonly/utils/invite-code` | `invite-code/` | Invite-code formatting and validation |
| `@leonly/utils/logger` | `logger/` | Pino options and error sanitization |
| `@leonly/utils/contracts` | `contracts/` | Event payload types and runtime validation |
| `@leonly/utils/queue` | `queue/` | SQS clients, URL validation, and publishing |
| `@leonly/utils/storage` | `storage/` | S3-compatible clients, bounded downloads, conditional writes, and signing |

Backend modules are not re-exported from the root entry point, keeping browser imports separate
from AWS and logging code. Production builds exclude tests; typechecking includes them.

## Build and verification

Run from the repository root:

```bash
pnpm --filter 'api...' --filter 'workers...' check
pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 typecheck
pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 test:run
pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 build
```

App scripts build their workspace dependencies automatically. Package builds compile TypeScript
to `dist`; the database build first generates its CommonJS Prisma client.
Workspace gates run applications sequentially because their dependency preparation writes the
same generated client directory. Run these gates one at a time; overlapping commands can race
Prisma generation. Root Turbo build/test/typecheck commands also serialize tasks.

## Database ownership

Schema and migration history live in `database/prisma`. Import `PrismaClient`, enums, and model
types from `@leonly/database/client`, and connection configuration from `@leonly/database`.
API and workers each construct a runtime client, with their own connection pool and lifecycle.

```bash
pnpm --filter @leonly/database prisma:generate
pnpm --filter @leonly/database prisma:migrate:dev
pnpm --filter @leonly/database prisma:migrate
```

Package-level Prisma commands use the caller's `DATABASE_URL`. For local API migrations, use
`pnpm --filter api prisma:migrate:dev` or `pnpm --filter api prisma:migrate`. The API config loads
`apps/api/.env` without overriding supplied environment variables and injects the URL into
`database/prisma-config.ts`. The factory keeps schema and migration paths anchored to the database
package. Client generation and builds do not require a database URL or apply migrations.

## Runtime boundaries

Pass queue URLs, regions, bucket names, and endpoint overrides from the owning app.
Queue clients use AWS credential discovery. Storage clients do the same when explicit credentials
are omitted; R2/local endpoints can supply a complete credential pair and a separate browser
signing endpoint. Packages never load application runtime environment variables or depend on NestJS.

`publishMessage` sends a JSON payload through the injected client, forwards cancellation, and
returns the SQS message ID. Lambda event-source mappings deliver queue messages to worker handlers;
the queue module does not poll or consume them.

Keep permission checks, transactions, outbox state changes, image recipes, and orphan-selection
rules in API or workers. Tests mock infrastructure boundaries and keep application fixtures local.
