# 03. Provision Staging Infrastructure

**Prerequisites:** Staging access, the protected state bucket, and provider credentials.

## User Story

As a developer, I want Terraform to provision and configure isolated staging services so the API,
worker, and frontend can run against real infrastructure.

## Work to do

Track the infrastructure review findings and verification in the
[staging infrastructure review checklist](03-staging-infrastructure-review.md).

1. Configure the staging S3 backend with native lockfiles and test shared state access, locking,
   recovery, and isolated version restoration. Back up and explicitly migrate any existing staging
   state. Keep state, saved plans, and backups private.
2. Provision Neon in `aws-us-east-1`, isolated Upstash Redis, and private R2 uploads with the
   staging frontend origin. Protect persistent resources from accidental destruction. Configure
   separate migration, API, and worker database roles and versioned SQL grants; use a direct URL
   for migrations and pooled URLs for runtimes.
3. Extend the existing staging modules for ECR, API and worker Lambdas, API Gateway, SQS/DLQ,
   runtime roles, and logs. Scope the OIDC deployment role to the resources it manages. Use
   immutable image digests, 30-day log retention, bounded worker concurrency, and a small retained
   set of rollback images. Bootstrap repositories before pushing real images; never deploy a
   placeholder digest to a Lambda.
4. Configure the API Gateway custom domain and regional ACM certificate, certificate validation,
   and Cloudflare DNS. Set up a dedicated Vercel staging project, preferably through Terraform;
   set its production branch to `staging`, disable automatic Git deployments, and assign the
   frontend domain. Confirm HTTPS certificate coverage for both nested hostnames.
5. Configure staging origins, CORS, secure cookies, Google OAuth, and separate API and worker runtime
   environment maps. Scope R2 object credentials to the upload bucket. Use
   `BETTER_AUTH_COOKIE_DOMAIN=stg.leonly.eduardov.dev` and verify frontend proxy and API behavior.
6. Configure on-demand services, API throttling, and an AWS budget alert. Document the $5/month
   cross-provider target, free-tier assumptions, and that alerts do not cap spending.

## Acceptance Criteria

- Terraform plans and provisions isolated staging services; local Floci and future production are
  unaffected. Neon, Redis, R2, queues, and application roles have the required least privileges.
- State and lockfile access works locally and through OIDC; lock contention and recovery are tested.
  Secrets supplied to Lambda through Terraform are recognized as present in state and saved plans.
- The worker is ready before API publication, and initial queue consumption stays disabled until
   the worker is verified. Terraform uses real digests for first creation; app CD owns subsequent
   image updates and `live` alias promotion.
- Both staging domains use valid HTTPS; trusted origins, upload CORS, and authentication cookie
  scope are configured without exposing backend secrets to the frontend.
- Terraform formatting and validation pass; provider behavior and API/worker probes are verified.
  Explain the relevant inputs, outputs, dependencies, and plan changes before applying.

See [infrastructure setup](../../../../infra/README.md) and
[the deployment guide](../../../operations/deployment-guide.md).
