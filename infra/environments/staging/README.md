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

3. Push the first images before provisioning the Lambda functions. Use their digests for initial
   creation. Later code-only releases publish new Lambda versions and promote the `live` aliases.
