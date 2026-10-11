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

Provide `DATABASE_URL` and the API's `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, and `STORAGE_SECRET_ACCESS_KEY`. The worker needs neither API authentication configuration nor Redis. It reads queue records through the Lambda event source, not an SQS polling client.

`@leonly/database` owns the Prisma schema, migrations, generated client, and
`PrismaConnection.createAdapter`. The worker creates its own runtime client with worker-specific
pool and timeout limits. `@leonly/utils/storage` supplies reusable object operations and
`@leonly/utils/contracts` supplies event validation. `pnpm --filter workers prisma:generate` forwards to
the database package. Build/test/typecheck scripts build workspace dependencies and generate the
shared client automatically. Tests retain worker-local fixtures.

Package worker output and production dependencies, including these packages and Sharp's
runtime-compatible native binary, together. Configure the Lambda handler with the entry point
above. The deployment image and event-source mapping belong to section 7.

## Processing behavior

Records and variants run sequentially; native Sharp concurrency is one and its cache is disabled in the handler. Processing claims last 300 seconds and token/recipe fencing protects metadata. Ready variants survive partial failures. Conditional output writes never replace accepted bytes, and resumed writes verify stored bytes against the recipe output before recording readiness.

Recipe 1 uses the existing auto-orientation, 40-million-pixel bound, aspect-preserving resize without enlargement, WebP quality 85, and 1024/1600 cover/detail bounds. Originals are bounded at 5 MiB and variant downloads at 10 MiB. Permanent image/contract failures are diagnosed and returned as failed records, allowing the configured receive limit to send them to a DLQ. Transient failures are also isolated per record. Queue redrive, Lambda sizing/architecture, and local polling remain section 7 decisions.

Rollback: pause the event source and disable new publication before removing worker code. Preserve original/output objects and database records.
