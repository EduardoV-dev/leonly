# Staging infrastructure review checklist

**Status:** Open. The staging state and access bootstrap exists, but the application infrastructure
is not yet provisioned. This checklist tracks the review of story
[03: Provision Staging Infrastructure](03-provision-staging-infrastructure.md).

Review snapshot: November 2026, before the staging Terraform reset. References to the old
configuration describe what was reviewed. Recheck live settings and carry the open items into the
new configuration. A checked item means its fix and verification are complete.

## Provisioning blockers

- [ ] **STG-01 — Resolve Lambda concurrency capacity.** The reviewed AWS account reported a regional
  concurrency quota of 10. Staging no longer reserves worker concurrency; its queue mapping retains a
  maximum of two concurrent invocations. The worker shares account capacity and can be throttled when
  that capacity is exhausted. Verify the configuration can be applied and queue processing remains bounded.
- [ ] **STG-02 — Grant deployment permissions.** The live `leonly-deploy-staging` OIDC role has only
  state and lockfile permissions. Add least-privilege staging resource-management permissions, including
  restricted `iam:PassRole`, and verify the role can plan and deploy without accessing unrelated resources.
  The API Gateway HTTP API is tagged with `LeonlyEnvironment`; AWS documents child-resource tag
  inheritance for API Gateway V1, not V2. Do not assume that tag-scoped permissions cover HTTP API
  routes and integrations. Verify the authorization model before attaching the deployment policy.
- [ ] **STG-03 — Protect persistent resources.** `database.tf` sets Neon `prevent_destroy = false`;
  `storage.tf` and the image-queue module have no comparable staging guards. Protect Neon, R2 uploads,
  and pending queue work from accidental destruction while preserving local Floci behavior. Verify
  destructive plans are rejected where the protection applies.
- [ ] **STG-04 — Establish database identities and grants.** Create separate migration, API, and worker
  roles with versioned SQL grants. Use a direct migration URL and pooled runtime URLs; verify effective
  access, including default privileges for future objects. Neon API-created roles normally receive
  `neon_superuser` membership, so use an approach that actually creates restricted runtime roles.
- [ ] **STG-05 — Provision the staging API.** Staging now composes the real-environment API module
  with digest-based deployment, its own execution role, a separate runtime map, scoped queue publication,
  frontend origin, OAuth credential validation, and cookie scope. Null image digests bootstrap prerequisites
  without application Lambdas; the worker can be verified before API publication. Formatting, validation,
  and offline checks pass. Live provisioning, runtime secrets, worker probes, and API health remain pending.
- [ ] **STG-06 — Configure staging domains and HTTPS.** Add the regional ACM certificate, DNS validation,
  API Gateway custom domain and mapping, and Cloudflare DNS. Verify both staging hostnames resolve and
  present valid certificates. If Cloudflare proxies nested hostnames, confirm edge certificate coverage.
- [ ] **STG-07 — Configure the Vercel staging project.** Create the dedicated project, production branch
  `staging`, frontend domain, and required frontend settings. Disable automatic Git deployments and
  verify GitHub Actions owns deployment. Vercel's GitHub deployment-event setting alone does not stop
  automatic builds.

## Operational and security improvements

- [ ] **STG-08 — Bound log retention.** The API module now configures 30-day Lambda log retention
  and scoped log writes. The worker log group still has no retention setting. Configure the remaining
  groups and verify deployed retention.
- [ ] **STG-09 — Retain dead-letter messages longer.** Both queues in
  `infra/modules/image-queue/main.tf` use the four-day default. Explicitly set DLQ retention longer than
  source retention: standard SQS messages retain their original enqueue time after redrive. Verify the
  resulting queue attributes without changing local behavior unintentionally.
- [ ] **STG-10 — Bound ECR image retention.** The shared worker repository now uses immutable tags,
  but has no lifecycle policy. Retain a small rollback set; preview lifecycle rules and verify they
  preserve the deployed and rollback digests.
- [ ] **STG-11 — Enforce HTTPS for the state bucket.** The live bucket had no bucket policy. Add a
  `aws:SecureTransport` deny for insecure requests and verify legitimate Terraform state and lockfile
  access still works. Bucket encryption and public-access blocks do not enforce transport security.
- [ ] **STG-12 — Configure cost controls.** The live AWS account had a $10 account-wide budget with
  actual-spend notifications at 80% and 100%; no staging budget was declared. Allocate the $5 monthly
  cross-provider target, configure useful AWS alerts, and set an Upstash budget if using pay-as-you-go.
  Verify provider plans and alert delivery. AWS alerts notify but do not cap spending.
- [ ] **STG-13 — Correct infrastructure documentation.** `infra/README.md:38–39` described Neon as
  protected although its Terraform guard was disabled; lines 197–200 said the S3 backend was not yet
  configured although the bucket and backend existed. Update the guide to match the verified state.

## Evidence and outstanding verification

### Module ownership update

Reusable modules target real AWS staging and future production. Floci owns its local resource
declarations. The owner chose a clean local rebuild rather than state migration, so the former
module-to-root move mappings have been removed. Both local deployment scripts now plan and apply
the entire local environment without targeting. Destroy old local resources before discarding state;
do not apply the new root addresses over the old module-owned resources without that reset.

Live staging planning is blocked by the expired `stg-admin` login. No cloud apply was performed.

### Original review snapshot

At review time, `terraform fmt -check -recursive infra` and staging `terraform validate` passed. The
remote S3 state contained zero resources. The state bucket had versioning, server-side encryption,
public-access blocks, and bucket-owner-enforced ownership. The OIDC trust restricted access to this
repository's `staging` environment. No Leonly Lambda, ECR repository, SQS queue, or API Gateway was
found in `us-east-1`. Both staging hostnames failed DNS resolution from the review environment.

The declared worker uses a real-digest-shaped reference, queue-scoped consume permissions, a one-record
batch, partial-batch responses, and a 720-second queue visibility timeout for its 120-second function
timeout. Redis has TLS and Terraform destruction protection; R2 disables its public development domain
and restricts upload CORS. These are configuration observations, not proof of a deployed service.

- [ ] Verify live Neon, Upstash, Cloudflare, Vercel, and Google OAuth settings, credentials, isolation,
  costs, and permissions; those provider accounts were not inspected during the review.
- [ ] Verify shared state access through local credentials and GitHub OIDC, lock contention and recovery,
  and restoration of a prior version to an isolated location. Preserve existing state before migration.
- [ ] Review an authenticated Terraform plan, including dependencies and changes, before applying.
  Treat state, saved plans, and backups as secret-bearing.
- [ ] Verify API and worker health, frontend proxy and cookie behavior, OAuth, HTTPS, and an authenticated
  upload through the queue. Confirm scoped R2 credentials and separate runtime secrets.

## Provider references

- [Terraform S3 backend and lockfile permissions](https://developer.hashicorp.com/terraform/language/backend/s3)
- [AWS Lambda reserved concurrency](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html)
- [AWS SQS dead-letter queue retention](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html)
- [Neon roles and privileges](https://neon.com/docs/manage/roles)
- [Vercel automatic Git deployments](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled)
- [Cloudflare Universal SSL hostname coverage](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/)
- [Upstash Redis pricing and budget](https://upstash.com/pricing/redis)
