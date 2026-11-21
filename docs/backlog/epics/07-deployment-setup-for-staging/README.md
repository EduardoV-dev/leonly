# 07. Automated Staging Deployment

Make every merged change to `staging` an automated, verified release of the frontend, API, and
image worker. Explain Terraform as it is introduced so the owner understands its changes.

## Release path

1. Open a PR targeting `staging`. CI checks the frontend, backend, and Terraform without deployment credentials.
2. GitHub branch protection blocks direct pushes and requires the checks to pass before merging.
3. After merge, GitHub Actions deploys the merged commit and reports the result in GitHub Deployments.
4. The pipeline verifies the backend before deploying the frontend, then runs final smoke checks.

## Confirmed setup

| Area | Decision |
| --- | --- |
| Frontend | New Vercel project at `https://stg.leonly.eduardov.dev`; GitHub Actions owns deployment. |
| Backend | AWS Lambda, API Gateway, ECR, and SQS in `us-east-1`; API at `https://api.stg.leonly.eduardov.dev`. Terraform state uses a separate private, versioned S3 bucket. |
| Data | Terraform-provisioned Neon in `aws-us-east-1` and isolated Upstash Redis. |
| Cloudflare | DNS for `eduardov.dev` and private R2 uploads. |
| Releases | Public repository; required PR checks gate merges to `staging`, which trigger automatic deployment without a separate approval. |
| Budget | Target $5/month for staging, using eligible free plans and low usage; not a guaranteed spending cap. |

Production at `leonly.eduardov.dev` is future work. Do not create production resources or change
local Floci behavior as part of this epic.

## Work order

| Order | User story | Finish when |
| --- | --- | --- |
| 02 | [Prepare staging access](02-prepare-staging-access.md) | One-time account, state, credentials, and GitHub access setup is ready. |
| 03 | [Provision staging infrastructure](03-provision-staging-infrastructure.md) | Terraform manages the staging services, domains, and configuration. |
| 04 | [Automate staging releases](04-automate-staging-releases.md) | Required checks gate releases; CD deploys, verifies, and supports recovery. |

## Deployment order

First bootstrap the state bucket and CI access. Provision data services and ECR repositories before
publishing the first images. Configure domains and OAuth before testing sign-in.

After merge: apply prerequisite Terraform changes → build and push affected images → run compatible
migrations once → publish and promote selected Lambda versions → backend verification → Vercel
deployment → smoke checks. Terraform owns configuration; app CD owns the released image and `live`
alias target after the initial function creation.

## Documentation expectations

Each implementation checkpoint explains the relevant `.tf` files, inputs, outputs, dependencies,
and plan changes in plain English. Keep durable setup and recovery instructions under `infra/`;
these backlog stories are deleted when completed, following the [backlog lifecycle](../../README.md).

Start from [existing infrastructure](../../../../infra/README.md). Extend its staging bucket, queue,
and worker configuration; the staging API and protected state backend still need verification and wiring. Cleanup
workers remain deferred. Coordinate logging with the existing observability epic; its approved
initial retention is 30 days, with cost controlled through bounded volume and retained images.
