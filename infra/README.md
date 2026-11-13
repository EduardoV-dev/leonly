# Memory upload storage

Terraform configures a private staging R2 bucket and a local Floci S3 bucket.
Both allow browser PUT requests from explicitly supplied frontend origins with
the `Content-Type` and `If-None-Match: *` headers required by upload issuance. Neither configures object
expiration, lifecycle rules, public domains, or cleanup.

Image processing is the only worker. The file-cleanup Lambda, schedule, and related
permissions are deferred; abandoned uploads and superseded sources remain stored.

## Staging R2

1. Set `CLOUDFLARE_API_TOKEN` to a server-side provisioning token with R2 storage
   write permission for the selected account. Do not put it in source control.
2. Supply `TF_VAR_cloudflare_account_id`, `TF_VAR_memory_upload_bucket_name`, and
   `TF_VAR_frontend_origins` (a JSON list of HTTPS origins, without trailing paths).
   Configure AWS credentials for provisioning and supply `TF_VAR_aws_region` and
   `TF_VAR_image_queue_name` for the staging image queue and DLQ.
3. Run `terraform -chdir=infra/environments/staging init`, followed by
   `terraform -chdir=infra/environments/staging plan`. Review before applying.

Copy `infra/environments/staging/example.tfvars` to an ignored `local.tfvars`
in that directory and replace the explicit placeholders. Pass
`-var-file=local.tfvars` to plan/apply commands. Alternatively, provide the same
inputs through `TF_VAR_*`. Bucket/account/origins, AWS region, queue/worker names,
existing API role, image digest, and processing enablement have no defaults.

`worker_environment_variables` is a sensitive map supplied through that file,
matching the existing API configuration pattern. It requires the worker database
URL and bucket-scoped R2 object read/write credentials. Terraform supplies the
authoritative R2 bucket/endpoint and region `auto`. The Cloudflare provisioning
token is separate from those application S3 credentials. No Secrets Manager
integration is used. Environment values enter Terraform state; protect that
state and its backups and keep tfvars out of source control.

The worker role can consume only the image queue and write only its own log
group. The existing API execution role receives `sqs:SendMessage` only for that
queue. ECR image retrieval is restricted to the named Lambda. Give the worker
database credential SELECT access to `files`, `memory_files`, `memories`, and
`spaces`; INSERT access to `files`; and UPDATE access to `files` for operation
leases and processing metadata. It does not require schema-creation or
authentication-administration privileges. R2 credentials must be scoped to the
selected private bucket.

### Container deployment order

1. Fill the staging tfvars file. For the initial repository-only bootstrap,
   use a clearly temporary all-zero SHA-256 digest in `image_worker_image_digest`.
   Plan with `-target=aws_ecr_repository.image_worker -var-file=local.tfvars`,
   review it, and apply that repository-only plan. Do not apply the complete
   environment with the temporary digest.
2. Build the image with `docker build --platform linux/amd64 --provenance=false
   -f apps/workers/Dockerfile -t leonly-image-worker:local .`. Authenticate Docker
   to the output ECR registry, tag/push the image, and replace the temporary
   digest with the actual pushed image digest.
3. Plan/apply the complete environment with `image_processing_enabled = false`.
   Inspect the Lambda configuration and run a bounded worker probe before
   enabling the mapping through the same variable.
4. Configure the staging API's `SQS_QUEUES_URLS` as
   `{"memories":"<image_queue_url output>"}` and use the same AWS region.
   Supply its bucket-scoped storage credentials and R2 endpoint, deploy the
   compatible worker before allowing API publication, then enable processing.

Rollback: set `image_processing_enabled = false` and disable new creation and
publication traffic. Keep schema, bucket objects, queues, and unpublished events
intact. Do not destroy storage as a rollback mechanism.

## Deploy the local API

With the Compose services running and `floci-local/local.auto.tfvars` configured, build
the API image and deploy it from the repository root:

```bash
pnpm --filter api build:image
pnpm api:deploy:local
```

The deploy command reuses `leonly-api:latest`; skip the build when that image is already current.
It requires the existing local API ECR repository, Docker, Terraform, AWS CLI, and Node.js 22.6+.
It gives the image a unique dev tag, applies a saved API/queue-permission plan, and waits for
Lambda readiness. Floci uses the image directly from Docker; no ECR push is needed.

After applying, the command saves `api_image_tag` in the ignored `local.auto.tfvars`, preserving
other configuration. Failed applies leave the stored tag unchanged. Plans containing resource
deletions or changes outside the API and its queue dependencies are rejected. The worker is
deployed separately with `pnpm workers:deploy:local`.

Keep the deployed dev-tagged image available for cold starts. To roll back, tag a retained image
as `leonly-api:latest` and rerun the deploy command. This changes code without removing application
data. The frontend remains a separate Next.js process/deployment.

Check the deployed API through Floci's gateway using its API hostname:

```bash
API_ENDPOINT=$(terraform -chdir=infra/environments/floci-local output -raw api_endpoint)
curl --fail -H "Host: ${API_ENDPOINT#https://}" http://localhost:4566/api/health
```

Expect `{"status":"ok","checks":{"database":"up","redis":"up"}}`.
Floci can continue reporting empty Lambda `image_config` and worker reserved-concurrency
differences after applying. Inspect live Lambda configuration before treating those as runtime drift.

### Connect the web app to Floci

Start the localhost proxy from the repository root:

```bash
pnpm api:proxy:local
```

The proxy listens on `127.0.0.1:3002` and forwards requests to Floci on port `4566`.
It reads the gateway hostname from Terraform, rewrites the upstream `Host` header,
and preserves cookies, request bodies, response headers, and status codes.

Set these values in `apps/web-app/.env.local`:

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002
```

Keep the API base URL without `/api`; the web app adds that prefix. Restart the web
app with `pnpm --filter web-app dev` in another terminal. The host-run NestJS API is
not needed. Keeping the browser-facing URL on `localhost` preserves the existing
localhost authentication cookie scope.

Verify the proxy with `curl --fail http://localhost:3002/api/health`; expect database
and Redis checks to be `up`. Stop the proxy with Ctrl+C.

## Local Floci S3

1. Start Floci with `docker compose -f apps/api/docker-compose.yml up -d floci`.
2. Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to Floci test credentials.
   Supply `TF_VAR_memory_upload_bucket_name` and `TF_VAR_frontend_origins` (a JSON
   list of HTTP(S) frontend origins). Supply `TF_VAR_image_queue_name` for the
   local image queue and DLQ.
3. Run `terraform -chdir=infra/environments/floci-local init`, followed by
   `terraform -chdir=infra/environments/floci-local plan`. This environment also
   manages the existing API Lambda; review its changes before applying.

Use storage region `us-east-1` and endpoint `http://localhost:4566` for host-based
clients and browsers. A container must use its reachable Floci endpoint for
server operations and retain the browser-reachable endpoint for signing. Never
rewrite a presigned URL's host after signing. Floci emulates S3; public-access
block configuration is not evidence that its security matches staging R2.

Both environments reuse `infra/modules/image-queue`: standard SQS queue, private
DLQ redrive allowance, managed encryption requested, 720-second visibility, and
5 receives before redrive. Message retention uses the provider's four-day
default for both queues. The outputs expose the image and dead-letter queue URLs.
The staging mapping uses the approved one-record batches and concurrency 2,
with `ReportBatchItemFailures`. Lambda memory/timeout are 1024 MiB/120 seconds.
Image references use a pushed digest rather than a mutable tag.

For automatic local processing, run `pnpm workers:deploy:local` to build a local worker image
and update the Lambda/SQS mapping. [Deploy the image worker to Floci](local-image-worker.md)
documents setup and the optional ECR push/digest flow for deployment verification.
There is no host-side worker queue runner.

## Checks

```bash
terraform fmt -check -recursive infra
terraform -chdir=infra/environments/staging validate
terraform -chdir=infra/environments/floci-local validate
terraform -chdir=infra/modules/image-queue init -backend=false
```

Live provider behavior requires the checks in
`openspec/changes/archive/2026-10-28-create-memory-upload-worker/provider-feasibility.md`.

Terraform state can contain sensitive configuration. Local state and `.tfvars`
are ignored by Git. The planned staging backend is a dedicated private, versioned
AWS S3 bucket; it has not yet been configured. Bootstrap the bucket, scoped access,
locking, and version recovery before applying the staging environment. R2 remains
the application upload store. Do not use bucket deletion or schema
removal to roll back creation traffic; retain tracked originals and pending work.
