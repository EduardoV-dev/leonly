# Provision staging ECR

This root owns the staging ECR repositories in `us-east-1`. It uses `staging/terraform.tfstate` in
the existing `leonly-terraform-state-staging` bucket with native S3 locking.

| Workload | ECR repository | Lambda name |
| --- | --- | --- |
| API | `leonly-api-staging` | `leonly-staging-api` |
| Image worker | `leonly-image-worker-staging` | `leonly-staging-image-worker` |

Tags are immutable. Terraform protects the repositories from accidental deletion, and the infra role
does not have permission to delete them. Add a repository for each independently released image.

## First apply

1. Review and apply the IAM policy changes in the [manual bootstrap root](../../bootstrap/staging/README.md).
   For an existing bootstrap, go straight to its plan after configuring your AWS session; imports
   are only for resources not already in state.
2. Run from the repository root with the same clean AWS shell, or with the `infra-staging` role
   once the infrastructure workflow is available:

   ```bash
   terraform -chdir=infra/environments/staging init -lockfile=readonly
   terraform -chdir=infra/environments/staging plan -lock-timeout=60s -out=staging.tfplan
   ```

   Expect two repository creations on a fresh state. Review the saved plan before applying:

   ```bash
   terraform -chdir=infra/environments/staging apply -lock-timeout=60s staging.tfplan
   terraform -chdir=infra/environments/staging output ecr_repository_urls
   ```

3. Merge the staging CD workflows into `staging`. **CD: Deploy staging applications** runs in
   publish-only mode by default. Copy both `repository@sha256:…` references from the run summary.
   Terraform needs them to create the image-based Lambdas. **CD: Deploy staging infrastructure**
   applies Terraform changes on `staging`; it uses the `infra-staging` role and rejects plans that
   would delete or replace resources.

## Enable application releases

1. Provision the staging database, runtime settings, both Lambda functions, and their `live` aliases
   before enabling releases. Keep traffic and SQS processing disabled until the first migration and
   release succeed. The staging root currently defines the ECR repositories. Apply the manual
   bootstrap policy update before the first Lambda promotion.
2. In GitHub's `app-staging` environment, set `STAGING_MIGRATION_DATABASE_URL` to the direct staging
   database URL for the migration role. Set the **repository variable** `STAGING_APP_RELEASE_ENABLED`
   to `true` when the prerequisites are ready. Use the separate pooled URLs in Lambda runtime config.
3. Run **CD: Deploy staging applications** on `staging` with `workload: both`. GitHub enables
   manual dispatch once the workflow is on `main` too. For later runs, choose `api`, `worker`, or
   `both`. Use `publish_only` to obtain image digests without changing the database or Lambda aliases.

API-only and worker-only changes release their respective workload. Changes to shared database or
utility code and shared build inputs release both. Terraform applies and the app migration/promotion
job share a queue. For a push that changes both Terraform and app code, the app waits for that
commit's infrastructure run to succeed. If an app run is superseded, rerun from current `staging`
for all affected workloads. Leave schema changes compatible with the versions currently serving.

Terraform creates the initial image and alias target; once those resources are defined, it must
ignore later changes to `image_uri` and alias `function_version`. App CD owns those updates. If an
infrastructure change updates versioned Lambda settings, run the app workflow for the affected
workload to publish those settings in a new version. Review the release summary for promoted versions.
