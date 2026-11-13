# 07. Deployment Setup for Staging

Provision staging and release it through GitHub Actions. Explain the Terraform as it is introduced
so the owner can understand each resource, permission, dependency, and planned change.

## Confirmed setup

| Area | Decision |
| --- | --- |
| Frontend | New Vercel project at `https://stg.leonly.eduardov.dev`; GitHub Actions owns deployment. |
| Backend | AWS Lambda, API Gateway, ECR, and SQS in `us-east-1`; API at `https://api.stg.leonly.eduardov.dev`. |
| Data | Terraform-provisioned Neon in `aws-us-east-1` and isolated Upstash Redis. |
| Cloudflare | DNS for `eduardov.dev`, private R2 uploads, and a separate private Terraform state bucket. |
| Releases | Public repository; pushes/merges to `staging` trigger checks and automatic Terraform apply without approval. |
| Budget | Target $5/month for staging, using eligible free plans and low usage; not a guaranteed spending cap. |

Production at `leonly.eduardov.dev` is future work. Do not create production resources or change
local Floci behavior as part of this epic.

## Work order

| Order | User story | Finish when |
| --- | --- | --- |
| 01 | [Configure accounts and access](01-configure-accounts-and-access.md) | Required IDs, permissions, credentials, and plan eligibility are known. |
| 02 | [Bootstrap Terraform state in R2](02-bootstrap-terraform-state-in-r2.md) | Private remote state, locking, and backup recovery are verified. |
| 03 | [Provision staging data services](03-provision-staging-data-services.md) | Neon, Redis, and private upload storage are ready. |
| 04 | [Provision the AWS backend](04-provision-aws-backend.md) | Image repositories, queues, and deployable API/worker infrastructure exist. |
| 05 | [Configure domains and authentication](05-configure-staging-domains-and-authentication.md) | HTTPS, Google login configuration, CORS, and cookie scope are correct. |
| 06 | [Configure the Vercel staging project](06-configure-vercel-staging-project.md) | The frontend builds with staging configuration and accepts CI deployments. |
| 07 | [Automate staging deployments](07-automate-staging-deployments.md) | GitHub Actions deploys the backend before Vercel and records the outcome. |
| 08 | [Verify staging and rollback](08-verify-staging-and-rollback.md) | Real user flows, failure handling, recovery, and budget checks pass. |

## Deployment order

First bootstrap the state bucket and CI access. Provision data services and ECR repositories before
publishing the first images. Configure domains and OAuth before testing sign-in.

Routine releases: checks → build artifacts → foundational Terraform changes → compatible migrations
→ Terraform-managed worker update → Terraform-managed API update → backend verification → Vercel
deployment → smoke checks. Apply each saved plan automatically after checks pass; keep Lambda image
updates in Terraform so configuration and deployed releases stay consistent.

## Documentation expectations

Each implementation checkpoint explains the relevant `.tf` files, inputs, outputs, dependencies,
and plan changes in plain English. Keep durable setup and recovery instructions under `infra/`;
these backlog stories are deleted when completed, following the [backlog lifecycle](../../README.md).

Start from [existing infrastructure](../../../../infra/README.md). Extend its staging bucket, queue,
and worker configuration; the staging API and protected state backend still need wiring. Cleanup
workers remain deferred. Coordinate logging with the existing observability epic; its approved
initial retention is 30 days, with cost controlled through bounded volume and retained images.
