# Local infrastructure with Floci

## Environment ownership

The bucket input and output are named `storage_bucket_name`. Rename any existing
`memory_upload_bucket_name` entries in local tfvars, `TF_VAR_memory_upload_bucket_name`
environment variables, and scripts reading the old Terraform output. The new output becomes
available in existing state after a reviewed apply. Storage resources now use `files` addresses.
Rebuild Floci from clean local state before applying these renamed resources.

Floci declares its API, queues, worker, and storage directly under `environments/floci-local`.
Run its Terraform checks locally. `infra/modules` is reserved for staging and production.
See the [deployment guide](../docs/operations/deployment-guide.md) for cloud infrastructure work.

The local S3 bucket allows browser PUT requests from configured frontend origins with the
`Content-Type` and `If-None-Match: *` headers required by upload issuance. Image processing is the
only worker. Abandoned uploads and superseded sources remain stored until cleanup is implemented.

## Deploy the local API

### Clean local rebuild

The local configuration uses dedicated root resources and has no migration mappings for the
former modules. Destroy the old local resources using their existing state before rebuilding;
deleting only the state file leaves unmanaged resources. Local uploads and queued work are lost
when their resources are destroyed. Staging is a separate environment.

After the reset, configure `local.auto.tfvars` from `example.tfvars`, keeping
`image_worker_local_image_uri = null` and `image_worker_image_digest = null` for the first API
deployment. Build the API image and run the commands below in order. The API command can create
its ECR repository and Lambda in the same full-environment apply; the repository need not exist
before Docker tags the local image.

Floci's ECR backing registry persists separately in the Docker volume `floci-ecr-registry-data`.
Clearing `apps/api/data` alone does not clear that registry: its repository catalog can reappear
when the registry starts and cause `RepositoryAlreadyExistsException`. Include the backing registry
and its volume when intentionally resetting all Floci data; this deletes locally stored registry images.

```bash
pnpm --filter api build:image
pnpm api:deploy:local
pnpm workers:deploy:local
```

The first apply creates the API and supporting resources. The worker command builds its image
and adds the worker and SQS mapping. Both commands reconcile the entire environment without
resource targeting. Each retains the other application's configured image reference, so keep
both referenced images available on Docker for subsequent deployments.

With the Compose services running and `floci-local/local.auto.tfvars` configured, build
the API image and deploy it from the repository root:

```bash
pnpm --filter api build:image
pnpm api:deploy:local
```

The deploy command reuses `leonly-api:latest`; skip the build when that image is already current.
It requires Docker, Terraform, AWS CLI, and Node.js 22.6+.
It gives the image a unique dev tag, applies a saved full-environment plan, and waits for
API Lambda readiness. Floci uses the image directly from Docker; no ECR push is needed.

After applying, the command saves `api_image_tag` in the ignored `local.auto.tfvars`, preserving
other configuration. Failed applies leave the stored tag unchanged. Both scripts reject plans
containing resource deletions or replacements; they allow pending updates anywhere in the local
environment. The worker image is rebuilt with `pnpm workers:deploy:local`.

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
   Supply `TF_VAR_storage_bucket_name` and `TF_VAR_frontend_origins` (a JSON
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

Floci declares a standard SQS queue with a private DLQ redrive allowance, managed encryption
requested, 720-second visibility, and 5 receives before redrive. Message retention uses the
provider's four-day default for both queues. The outputs expose the image and dead-letter queue URLs.

For automatic local processing, run `pnpm workers:deploy:local` to build a local worker image
and update the Lambda/SQS mapping. [Deploy the image worker to Floci](local-image-worker.md)
documents setup and the optional ECR push/digest flow for deployment verification.
There is no host-side worker queue runner.

## Checks

```bash
terraform -chdir=infra/environments/floci-local fmt -check
terraform -chdir=infra/environments/floci-local init -backend=false -input=false -lockfile=readonly
terraform -chdir=infra/environments/floci-local validate
```

Live provider behavior requires the checks in
`openspec/changes/archive/2026-10-28-create-memory-upload-worker/provider-feasibility.md`.

Terraform state can contain sensitive configuration. Keep local state and private `.tfvars` out
of Git. Do not use bucket deletion or schema removal to roll back creation traffic; retain tracked
originals and pending work.
