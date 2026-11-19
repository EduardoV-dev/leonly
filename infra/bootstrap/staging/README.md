# Bootstrap staging deployment access

Run this Terraform root manually with the `ev-admin` AWS profile. It manages the GitHub OIDC
provider and deployment roles for `EduardoV-dev/leonly`. The state bucket already exists and is
managed outside this root.

| GitHub environment | AWS role | Permissions in this root |
| --- | --- | --- |
| `infra-staging` | `leonly-deploy-infra-staging` | Read/write `staging/terraform.tfstate`, manage its `.tflock`, and create and configure the two staging ECR repositories. |
| `app-staging` | `leonly-deploy-app-staging` | Push and resolve images in `leonly-api-staging` and `leonly-image-worker-staging`. Update and publish `leonly-staging-api` and `leonly-staging-image-worker` Lambda functions and promote their `live` aliases. |

Bootstrap state is stored in `s3://leonly-terraform-state-staging/bootstrap/staging.tfstate` in
`us-east-1`, with native S3 locking. If you initialized the former `infra/bootstrap/` root, run
`init` in the new directory to reconnect to the same state. No state migration is needed.
Only the operator can read or write this state. The infra role can list keys in the staging bucket
so Terraform can distinguish a missing staging state object from denied access. If an older
staging state key already contains resources, resolve that state migration before creating or applying
the staging infrastructure root.

## First run

1. In GitHub, create `infra-staging` and `app-staging` under **Settings → Environments**. Restrict
   both to the `staging` branch and protect that branch with required PR checks. Keep deployment
   environments and `id-token: write` off PR verification jobs. IAM checks the exact repository,
   environment, and audience; GitHub enforces the branch restriction.
2. From the repo root, sign in and confirm the AWS account shown is your staging account. The
   `unset` commands keep Floci's credentials and endpoints out of this shell session.

   ```bash
   unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN AWS_DEFAULT_PROFILE
   unset AWS_ENDPOINT_URL AWS_ENDPOINT_URL_S3 AWS_ENDPOINT_URL_IAM AWS_ENDPOINT_URL_STS
   export AWS_PROFILE=ev-admin AWS_IGNORE_CONFIGURED_ENDPOINT_URLS=true
   aws login --profile ev-admin
   aws sts get-caller-identity

   ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
   aws s3api head-bucket --bucket leonly-terraform-state-staging --expected-bucket-owner "$ACCOUNT_ID"
   terraform -chdir=infra/bootstrap/staging init -lockfile=readonly
   ```

   Confirm the bucket is in `us-east-1`, has versioning, encryption, and public access blocked, and
   enforces HTTPS. If a customer-managed KMS key protects state, configure its permissions separately.
3. Check for existing IAM resources before the first plan. `NoSuchEntity` means the item can be
   created; an access or login error means the check did not run successfully.

   ```bash
   OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
   aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN"
   aws iam get-role --role-name leonly-deploy-infra-staging
   aws iam get-role --role-name leonly-deploy-app-staging
   ```

   If an existing resource should be owned by this root and is not already in its state, import it:

   ```bash
   terraform -chdir=infra/bootstrap/staging import aws_iam_openid_connect_provider.github "$OIDC_ARN"
   terraform -chdir=infra/bootstrap/staging import 'aws_iam_role.deploy["infra"]' leonly-deploy-infra-staging
   terraform -chdir=infra/bootstrap/staging import 'aws_iam_role.deploy["app"]' leonly-deploy-app-staging
   ```

   Run only the imports for resources that exist. If another Terraform root owns the OIDC provider,
   use a data source here instead of importing it into a second state. Preserve other OIDC audiences
   if the provider is shared. For each existing role, inspect `aws iam list-role-policies` and
   `aws iam list-attached-role-policies` with its `--role-name`: importing a role does not remove
   legacy policies. Review those grants and remove obsolete ones before enabling the workflows.
   Import only roles with the new names. AWS cannot rename IAM roles in place. If bootstrap already
   manages `leonly-deploy-staging` or `leonly-deploy-staging-app`, the plan will replace them; check
   for callers using those ARNs before applying. Retire any unmanaged legacy roles after callers
   switch to the new roles.
4. Review the saved plan before applying. Expect only IAM resources in this plan. Stop if it shows
   an unexpected replacement or a change to shared access.

   ```bash
   terraform -chdir=infra/bootstrap/staging plan -out=bootstrap.tfplan
   terraform -chdir=infra/bootstrap/staging apply bootstrap.tfplan
   terraform -chdir=infra/bootstrap/staging output
   ```

   Keep the plan private and discard it after applying. Use the two role ARN outputs when wiring
   the matching GitHub deployment jobs. Next, provision the [staging ECR repositories](../../environments/staging/README.md).

## Offline checks

Run in a fresh checkout or with a separate `TF_DATA_DIR` if the S3 backend is already initialized.

```bash
terraform -chdir=infra/bootstrap/staging fmt -check -recursive
terraform -chdir=infra/bootstrap/staging init -backend=false -input=false -lockfile=readonly
terraform -chdir=infra/bootstrap/staging validate
```
