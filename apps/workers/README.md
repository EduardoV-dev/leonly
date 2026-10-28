# Image worker

Build and check from the repository root:

```bash
pnpm --filter workers build
pnpm --filter workers test:run
```

The Lambda entry point is `dist/functions/image-processing/handler.handler`.
`processImage` in `src/functions/image-processing/process-image.ts` is separately callable with
database/storage dependencies; `processImageBatch` applies the same processor to SQS records and
returns partial batch failures. Sharp validation and variant generation live in `src/services/image`.

## Runtime configuration

Provide `DATABASE_URL`, `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, and `STORAGE_SECRET_ACCESS_KEY`. The worker needs neither API authentication configuration nor Redis or publisher queue configuration. Both production and Floci receive queue records through a Lambda event-source mapping.

`@leonly/database` owns the Prisma schema, migrations, generated client, and
`PrismaConnection.createAdapter`. The worker creates its own runtime client with worker-specific
pool and timeout limits. `@leonly/utils/storage` supplies reusable object operations and
`@leonly/utils/contracts` supplies event validation. `pnpm --filter workers prisma:generate` forwards to
the database package. Build/test/typecheck scripts build workspace dependencies and generate the
shared client automatically. Tests retain worker-local fixtures.

`Dockerfile` packages worker output and production dependencies, including Sharp's
runtime-compatible native binary, into the existing Node.js 24 x86_64 Lambda image convention.
Build with `docker build --platform linux/amd64 --provenance=false -f apps/workers/Dockerfile -t leonly-image-worker:local .` from the repository root.

## Local Floci execution

Run `pnpm workers:deploy:local` from the repository root to build a fresh local Docker image
and update the worker Lambda/SQS trigger without an ECR push. See the
[local deployment guide](../../infra/local-image-worker.md) for setup and optional ECR
deployment verification. There is no manual queue runner.
After deployment, start the API and web app normally and create a memory. Floci polls the
image queue and invokes `handler.handler` automatically, using the same image as production.

Configure the Lambda with `postgres:5432` and `http://floci:4566` on the `api_default`
Docker network through the shared `environment_variables` map in an ignored
`.auto.tfvars` file. The Lambda does not read `apps/workers/.env`.
Host-run API storage/signing and SQS endpoints remain `http://localhost:4566`.
Failed records become eligible after the 720-second queue visibility timeout and move to
the DLQ after five receives. Floci stores resources persistently under `apps/api/data`.

## Processing behavior

Records and variants run sequentially; native Sharp concurrency is one and its cache is disabled in the handler. Processing claims last 300 seconds and token/recipe fencing protects metadata. Ready variants survive partial failures. Conditional output writes never replace accepted bytes, and resumed writes verify stored bytes against the recipe output before recording readiness.

Recipe 1 uses the existing auto-orientation, 40-million-pixel bound, aspect-preserving resize without enlargement, WebP quality 85, and 1024/1600 cover/detail bounds. Originals are bounded at 5 MiB and variant downloads at 10 MiB. Permanent image/contract failures are diagnosed and returned as failed records, allowing the configured receive limit to send them to a DLQ. Transient failures are also isolated per record.

Approved initial settings are 1024 MiB memory, a 120-second Lambda timeout, batch size 1,
concurrency 2, queue visibility 720 seconds, and DLQ redrive after 5 receives. Queue settings
are configured in `infra/modules/image-queue`; staging Lambda/IAM/event-source wiring
is in `infra/environments/staging/worker.tf`. Private configuration uses the
`worker_environment_variables` sensitive map supplied through an ignored tfvars file,
matching the existing API convention. Secrets Manager is not used.
Measurement details are in `openspec/changes/archive/2026-10-28-create-memory-upload-worker/worker-sizing.md`.

Rollback: pause the event source and disable new publication before removing worker code. Preserve original/output objects and database records.
