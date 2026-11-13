# 02. Bootstrap Terraform State in S3

**Prerequisites:** AWS provisioning access and the account/credential inventory.

## User Story

As the owner, I want protected remote Terraform state so local runs and GitHub Actions manage the
same staging resources without conflicting writes.

## Information needed

- AWS account, region, an available private bucket name, and a state key such as
  `staging/terraform.tfstate`.
- Local AWS access and the GitHub Actions OIDC role; scope state and lockfile permissions to the
  bucket and relevant keys.
- Selected Terraform CLI version and retention for previous state versions.

## Work to do

1. Create a dedicated private S3 state bucket before initializing the staging backend. Block public
   access, enable encryption and versioning, and document its bootstrap ownership and any protected
   local bootstrap state.
2. Configure Terraform's S3 backend for the bucket, region, and staging key. Use Terraform 1.10+
   for `use_lockfile`, or a newer version required by the selected providers.
3. Use local AWS credentials and short-lived GitHub Actions OIDC credentials without hardcoding
   secrets. Grant only the required state and lockfile access, separately from application uploads.
4. Test state read/write, lock acquisition, a competing run being blocked, and lock release.
5. Configure retention for previous state versions and test restoration in isolation. If existing
   staging state is found, back it up and migrate it explicitly.

## Acceptance Criteria

- Local and CI runs use the same remote staging state; local Floci state stays separate.
- Concurrent runs cannot modify staging state together; failed-run lock recovery is documented.
- A previous state version can be restored without deleting or recreating application resources.
- Secrets and plans remain private: `sensitive` hides output but does not remove secrets from state.
- The owner can explain backend vs provider, bucket vs object key, locking, and recovery.

References: [Terraform S3 backend](https://developer.hashicorp.com/terraform/language/backend/s3),
[S3 versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html).
