# Image worker sizing evidence

The user approved the resource settings below on 2026-10-11, completing the
selection and documentation in task 7.2. Queue settings are configured and
verified locally. Production Lambda wiring remains part of task 7.1.

## Runtime packaging

The worker follows the existing API convention: a Node.js 24 Lambda container
on Linux x86_64. `apps/workers/Dockerfile` builds workspace dependencies, deploys
production dependencies, and executes a Sharp WebP smoke check inside the Lambda
runtime image. It preserves `.npmrc` install-script restrictions.

```bash
docker build --platform linux/amd64 --provenance=false \
  -f apps/workers/Dockerfile -t leonly-image-worker:local .
```

Use `--provenance=false` when producing the single-architecture Lambda image.
The deployed package exposes `dist/functions/image-processing/handler.handler`.
Loading that handler with test storage/database configuration succeeded without
connecting to external services. No NestJS/API bootstrap is included.

## Bounded local recipe measurement

Measured on 2026-10-11 in the built Lambda image, Node.js v24.21.0, Sharp 0.35.4,
Linux x64. The container was limited to 1024 MiB and 0.5 CPU. Sharp concurrency
was 1 and caching was disabled, matching the production handler.

Input: one synthetic 6324 × 6324 RGBA PNG (39,992,976 pixels, 789,867 bytes),
near the 40-million-pixel limit. Each run performed actual original validation
and full raw decoding, then cover/detail generation and output verification.
RSS was sampled every 10 ms during the recipe.

| Run | Recipe duration | Sampled peak RSS |
|---|---:|---:|
| 1 | 3994 ms | 355 MiB |
| 2 | 3991 ms | 355 MiB |
| 3 | 4020 ms | 354 MiB |

Cover/detail outputs were 2030/4784 bytes. The temporary probe was
`/tmp/opencode/leonly-image-sizing.cjs`, mounted into the container and invoked
with `docker run --rm --memory=1024m --cpus=0.5 --entrypoint node`.

These are synthetic local measurements, not worst-case image processing,
network/database latency, or measured Lambda execution. The simple image is
high-resolution but low-entropy. CPU quotas do not establish AWS performance
equivalence. Real Lambda measurements are still required after deployment.

## Approved initial settings

| Setting | Recommendation | Reason |
|---|---:|---|
| Memory | 1024 MiB | Headroom over measured decoding RSS and additional runtime/network allocations |
| Function timeout | 120 seconds | Headroom for storage/database operations while staying below the 300-second lease |
| SQS batch size | 1 | Bound decoded-image memory and per-invocation work |
| Reserved/event-source concurrency | 2 | Bound database/storage pressure; use equal limits to avoid self-throttling |
| Queue visibility | 720 seconds | Six times the proposed function timeout |
| DLQ max receive count | 5 | Bounded retries with retained failure evidence |

Enable `ReportBatchItemFailures` on the event-source mapping. The handler already
reports failed records individually.

[AWS recommends queue visibility of at least six times the function timeout](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.md).
Settings must also preserve the worker's lease and bounded concurrency behavior.
