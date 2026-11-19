# Deployment guide

Use this guide to prepare a staging or production deployment. The staging Terraform root defines
the [ECR repositories](../../infra/environments/staging/README.md). The remaining cloud
infrastructure is pending. The PR workflows are in place:

| PR target | Workflow | Terraform root |
| --- | --- | --- |
| `staging` | `verify-terraform-staging.yml` | `infra/environments/staging` |
| `main` | `verify-terraform-production.yml` | `infra/environments/production` |

Each workflow skips Terraform until its root contains a `.tf` file. Commit the root's provider
lockfile when restoring its configuration. Configure the matching required Terraform check for
each branch if replacing an existing required check. Floci is tested locally.

## Who does what?

| Tool | Responsibility |
| --- | --- |
| Terraform | Define the cloud infrastructure and its configuration. |
| GitHub Actions | Run checks, build images, orchestrate deployment, and verify the release. |
| Prisma | Apply versioned database schema migrations. |
| GitHub Environment Secrets | Supply credentials to trusted deployment jobs. |

Terraform manages ECR repositories and Lambda image references. GitHub Actions builds and pushes
the images, then passes their immutable digests to Terraform. Do not update a Terraform-managed
Lambda separately from Terraform.

## Prepare each environment

1. **Separate environments.** Use isolated Terraform state, Neon projects, Redis databases, upload
   buckets, credentials, and GitHub environments for staging and production. Staging uses the
   `infra-staging` and `app-staging` GitHub environments and `us-east-1`; decide production settings
   before provisioning it.
2. **Bootstrap AWS access and state.** Use the [manual staging bootstrap](../../infra/bootstrap/staging/README.md)
   to adopt or create the OIDC provider and configure separate infrastructure and application roles.
   Bootstrap uses the existing private, encrypted, versioned S3 bucket with its own state key and
   native lockfile. GitHub obtains short-lived AWS credentials; do not store AWS access keys as
   GitHub secrets.
3. **Protect releases.** Require the API, worker, web, and Terraform PR checks on the release branch.
   Restrict direct pushes and deployment access. Serialize releases so migrations and infrastructure
   updates do not overlap.
4. **Prepare provider access.** Confirm Neon, Upstash, Cloudflare, AWS, Google OAuth, and Vercel
   accounts, permissions, regions, and plan capacity. Store deployment credentials in the matching
   GitHub Environment Secrets. Keep staging and production credentials separate.
5. **Configure domains and authentication.** Prepare DNS, HTTPS certificates, frontend and API
   origins, Google OAuth callback and test-user access, and the Better Auth secret and cookie scope.
   Staging uses `https://stg.leonly.eduardov.dev` and `https://api.stg.leonly.eduardov.dev`.

## Prepare runtime credentials

Provision the resources first, then add their credentials to the matching GitHub environment. Some
values cannot exist before the first provisioning step.

| Consumer | Credentials or configuration |
| --- | --- |
| Migration job | Direct Neon database URL for the migration role. |
| API Lambda | Pooled Neon URL for the API role, Upstash REST URL and token, R2 object credentials, Better Auth secret, and Google OAuth credentials. |
| Worker Lambda | Pooled Neon URL for the worker role and R2 object credentials. |
| Frontend build | Public site and API URLs for that environment. |

Use separate database roles and grant each only the permissions it needs. Role creation alone does
not grant table access: maintain grants as versioned SQL and apply them in the appropriate migration
or setup step. Prisma migrations remain the source of application schema changes.

Keep API and worker environment maps separate so the worker does not receive API-only secrets. The
existing applications read their database connections from `DATABASE_URL`; the migration job must
receive its direct connection as `DATABASE_URL` for the current Prisma configuration.

GitHub secrets do not keep secrets out of Terraform state or saved plans when Terraform supplies
ordinary Lambda environment variables. Restrict access to state, plans, deployment logs, and Lambda
configuration; do not upload secret-bearing plans as public artifacts. `sensitive` hides normal
output but does not remove values from state.

## First deployment and later releases

The first deployment needs a bootstrap phase. Terraform must create ECR repositories before the
pipeline can push images, and image-based Lambdas need real image digests. Provision foundational
services and roles, add the resulting runtime secrets to GitHub, then run the complete release.

For each release:

1. Pass the required PR checks and merge the release commit.
2. Build and push the API and worker images; record their digests.
3. Apply prerequisite infrastructure changes and run Prisma migrations using the direct database URL.
4. Deploy the worker and API through Terraform. Verify Lambda readiness and API health before
   deploying the frontend.
5. Deploy the frontend, run smoke checks, and report the result in GitHub Deployments. Keep failed
   or partial releases visible as failures.

## Verify and recover

- Test HTTPS, Google sign-in, an authenticated API request, and an image upload processed through
  SQS and the worker. Keep interactive Google sign-in as a manual first-deployment check.
- Keep previous image digests and the Vercel deployment ID for application rollback. Do not restore
  Terraform state or reverse database migrations as a routine application rollback.
- Document state lock recovery and previous-version restoration separately. Review plans before
  applying infrastructure changes, and keep backups private.
- Monitor usage and billing. The staging target is $5/month across services, not a guaranteed cap;
  an AWS budget alert does not stop spending.

For current implementation details, see [infrastructure setup](../../infra/README.md),
[staging deployment work](../backlog/epics/07-deployment-setup-for-staging/README.md), and
[operational logging](logging.md).
