# 02. Bootstrap Terraform State in R2

**Prerequisites:** Cloudflare provisioning access and the account/credential inventory.

## User Story

As the owner, I want protected remote Terraform state so local runs and GitHub Actions manage the
same staging resources without conflicting writes.

## Information needed

- Cloudflare account ID, an available private bucket name, and a state key such as
  `staging/terraform.tfstate`.
- Bucket-scoped R2 object read/write credentials, separate from application upload credentials.
- Selected Terraform CLI version, a private backup location, and backup retention.

## Work to do

1. Create a dedicated private state bucket before initializing the staging backend. Keep its
   bootstrap ownership and any local bootstrap state documented and protected.
2. Configure Terraform's S3 backend with the R2 endpoint and compatibility settings. Use Terraform
   1.10+ for `use_lockfile`, or a newer version required by the selected providers.
3. Supply backend credentials securely without hardcoding them or overriding the AWS provider's
   credentials. Retain private access, HTTPS, and R2's encryption at rest.
4. Test state read/write, lock acquisition, a competing run being blocked, and lock release. R2 is
   S3-compatible; HashiCorp's backend support for alternatives to S3 is best effort.
5. Keep protected timestamped state backups and test restoration in isolation. R2 does not provide
   S3 bucket versioning. If existing staging state is found, back it up and migrate it explicitly.

## Acceptance Criteria

- Local and CI runs use the same remote staging state; local Floci state stays separate.
- Concurrent runs cannot modify staging state together; failed-run lock recovery is documented.
- A state backup can be restored without deleting or recreating application resources.
- Secrets and plans remain private: `sensitive` hides output but does not remove secrets from state.
- The owner can explain backend vs provider, bucket vs object key, locking, and recovery.

References: [Cloudflare R2 backend guide](https://developers.cloudflare.com/terraform/advanced-topics/remote-backend/),
[Terraform S3 backend](https://developer.hashicorp.com/terraform/language/backend/s3).
