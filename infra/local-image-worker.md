# Deploy the image worker to Floci

Update the image worker with one command. Floci invokes it automatically from SQS.
Run commands from the repository root. Node.js 22.6+ or 24, Docker, Terraform, and AWS CLI
are required.

## Daily worker updates

With Floci/PostgreSQL running and `local.auto.tfvars` configured, run:

```bash
pnpm workers:deploy:local
```

The command checks Docker/Floci, builds `apps/workers/Dockerfile` with a fresh dev tag,
and applies a saved Terraform plan for the entire `floci-local` environment. It waits for
Lambda readiness and prints the deployed reference and log command. No registry login,
or ECR push is required. Pending API configuration changes can also be applied, using the
configured API image tag. Local test credentials are scoped to the command.

Floci uses the exact image already present on the Docker daemon. An AWS-shaped reference
does not contact AWS: all provisioning uses the Floci Terraform provider and explicit local
CLI endpoint. Every update gets a new reference so Floci invalidates the old runtime.
The shared repository is `leonly-workers-local`; the Lambda remains `leonly-image-worker-local`.
Floci uses the Dockerfile's image-processing handler because Lambda handler overrides have not been
verified in the emulator.

The command updates only `image_worker_local_image_uri` in the ignored `local.auto.tfvars`,
preserving other settings and any retained ECR digest. Failed builds/applies leave that
stored reference unchanged. Resource deletions and replacements in the saved plan are rejected.
Neither deployment script uses Terraform resource targeting. On a clean rebuild, deploy the API
first as described in the [infrastructure guide](README.md#clean-local-rebuild).

Run the command again after worker code changes. Keep each referenced local Docker image
available until replacing that deployment; clearing it from Docker may prevent a cold start.
Set `image_processing_enabled = false` to pause delivery; the command preserves that setting.

## Optional ECR deployment verification

Use the steps below when testing image publication and digest-based deployment rather
than the everyday local-image command. Production remains digest-pinned.

### 1. Start services and deploy the local API

```bash
docker compose -f apps/api/docker-compose.yml up -d postgres redis redis-http floci
```

Configure `infra/environments/floci-local/local.auto.tfvars` with:

```hcl
storage_bucket_name = "leonly-memory-photos-local"
image_queue_name          = "leonly-images-local"
frontend_origins          = ["http://localhost:3000"]
```

Use local AWS credentials (`test`/`test`) through your existing CLI profile or environment.
The Compose configuration enables persistent storage and path-style ECR URLs, avoiding
platform-specific `*.localhost` DNS resolution. A pre-existing memory-only Floci process
must have its objects and pending messages preserved before being recreated.

```bash
pnpm --filter api build:image
pnpm api:deploy:local
```

The complete API deployment also creates the worker's ECR repository before its image exists.
For a fresh setup, keep both worker image references null until the image is published.

### 2. Build and publish the image

```bash
REPOSITORY=$(terraform -chdir=infra/environments/floci-local output -raw workers_repository_url)
docker build --platform linux/amd64 --provenance=false \
  -f apps/workers/Dockerfile -t "$REPOSITORY:local" .
aws --region us-east-1 --endpoint-url http://localhost:4566 ecr get-login-password \
  | docker login --username AWS --password-stdin "${REPOSITORY%%/*}"
docker push "$REPOSITORY:local"
aws --region us-east-1 --endpoint-url http://localhost:4566 ecr describe-images \
  --repository-name leonly-workers-local --image-ids imageTag=local \
  --query 'imageDetails[0].imageDigest' --output text
```

Save the returned digest in `infra/environments/floci-local/local.auto.tfvars`:

```hcl
image_worker_image_digest = "sha256:<digest returned above>"
image_worker_local_image_uri = null
```

The local tfvars file is ignored by Git. The local image reference takes precedence when set;
set it to null to switch to the ECR digest. With neither reference supplied, Terraform
provisions no worker Lambda or event-source mapping.

### 3. Deploy the Lambda and trigger

Review and apply the complete local environment with the configured API image available:

```bash
terraform -chdir=infra/environments/floci-local plan
terraform -chdir=infra/environments/floci-local apply
```

This reconciles API, worker, queues, and storage together. Inspect all pending changes before
confirming the apply.

Configure `api_environment_variables` and `worker_environment_variables` separately in
`local.auto.tfvars`. Both containers need the Compose database (`postgres:5432`) and storage
(`floci:4566`); the worker does not need the API's authentication or Redis settings. Use
`example.tfvars` as the template; never use local credentials in production.

## Use and inspect the worker

Start the API/web app and create a memory. The API publishes an image event; Floci's enabled
event-source mapping invokes the worker. No `local:run` command or application poller exists.

```bash
aws --region us-east-1 --endpoint-url http://localhost:4566 lambda list-event-source-mappings \
  --function-name leonly-image-worker-local
aws --region us-east-1 --endpoint-url http://localhost:4566 logs tail \
  /aws/lambda/leonly-image-worker-local --follow
```

Expect `image_processed` with `outcome: completed`; duplicate deliveries report `already_completed`.
Original, cover, and detail rows should be `ready` in PostgreSQL. Failed records retry through SQS;
inspect `/aws/lambda/leonly-image-worker-local` and the `image_dead_letter_queue_url` output.
An unpublished outbox event still requires separate recovery; a running Lambda cannot consume
an event that never reached SQS.

## Updates and rollback

For daily updates, run `pnpm workers:deploy:local`. For ECR verification, repeat build/push,
replace the digest, and set the local image reference to null before applying. Reusing a tag
alone does not update deployed code. Restore a prior retained local image reference or ECR
digest and review/apply the complete environment to roll back code. Keep bucket objects and database records
intact. Persistent Floci resources resume after Compose restarts without redeployment.

Floci 2.1.0 was verified locally for image execution, SQS delivery, duplicate acknowledgment,
and restart persistence. Its documented SQS mapping concurrency emulation is not proof of AWS
concurrency or IAM enforcement; production verification remains separate.
