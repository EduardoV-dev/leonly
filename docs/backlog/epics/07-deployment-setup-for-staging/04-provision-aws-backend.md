# 04. Provision the AWS Backend

**Prerequisites:** AWS deployment access, protected state, and staging data-service configuration.

## User Story

As a developer, I want the API and image worker running on AWS so staging exercises the real
gateway, permissions, queue, and processing path.

## Information needed

- AWS account ID, region `us-east-1`, deployment role, and staging resource names.
- API/worker container image digests and ECR repository names.
- Private database/storage/Redis configuration, auth settings, and the image queue URL.

## Work to do

1. Extend `infra/environments/staging` and the existing shared modules. Inspect ownership before
   imports or changes; preserve the independent local Floci environment.
2. Provision ECR repositories, runtime IAM roles, SQS/DLQ, and log groups first. Push valid images
   before creating image-based Lambdas; never apply a placeholder image to a real function.
3. Grant the deployment role from access setup exactly the permissions this environment provisions,
   scoped to staging resource names. Application Lambdas use separate runtime roles.
4. Wire the API Lambda and HTTP API Gateway into staging. Reuse the image worker and queue wiring;
   replace the current assumption that the staging API execution role already exists.
5. Configure runtime roles and environment: real AWS queue endpoints, R2 endpoint/region `auto`,
   `NODE_ENV=production`, and `ENVIRONMENT=staging`. Grant only needed queue and log access.
6. Add explicit release checkpoints so compatible migrations precede new application code, the
   worker is ready before API publication, and initial queue consumption starts only after checks.

## Acceptance Criteria

- API and worker images are identified by immutable digests and remain Terraform-owned.
- The API has access to its queue; the worker consumes it and writes its own logs with bounded
   concurrency and existing retry/DLQ behavior.
- Log retention is explicit, coordinated with the approved 30-day observability default. Retain
   only a small documented set of ECR images sufficient for rollback; preserve active images.
- Use on-demand Lambda without NAT gateways, load balancers, or provisioned concurrency. Configure
   request throttling and a $5 AWS budget alert; explain that alerts do not stop spending and the
   target covers all services, not AWS alone.
- Terraform formatting/validation and real gateway/worker probes pass. Explain resource references,
  dependency ordering, execution roles, and the planned changes before the first release.
- The deployment role provisions staging through short-lived OIDC credentials without long-lived keys.

Starting points: `infra/modules/api`, `infra/modules/image-queue`, `infra/environments/staging`,
`apps/api/Dockerfile`, and `apps/workers/Dockerfile`.
