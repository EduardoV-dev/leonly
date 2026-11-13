# 07. Automate Staging Deployments

**Prerequisites:** bootstrapped state/access, provisionable staging infrastructure, and Vercel setup.

## User Story

As a developer, I want a push or merge to `staging` to deploy a verified release automatically and
show its result in GitHub Deployments.

## Information needed

- GitHub `staging` Environment and the verified account secrets/variables from access setup.
- Terraform backend configuration, AWS role ARN, ECR repository URLs, and Vercel project/team IDs.
- Direct migration database URL, runtime configuration, and the expected health/smoke checks.

## Work to do

1. Keep PR verification credential-free. Trigger the release on pushes to `staging` and allow a
   manual rerun of a selected trusted release. Restrict deployment to that branch/environment.
2. Run existing backend/frontend gates and Terraform checks against the exact release commit.
   Preserve serialized backend preparation because Prisma generation shares an output directory.
   Build both container images and the frontend artifact with pinned tools and lockfile installs.
3. Push images tagged with the commit SHA and capture their digests. Run authenticated Terraform
   plans only in the trusted release context; apply each exact saved plan automatically after checks.
   Keep secret-bearing plans private and ephemeral, outside public workflow artifacts.
4. Apply foundational changes, run existing Prisma migrate-deploy against the direct Neon URL,
   then apply Terraform-managed worker/API releases in dependency order. Initial processing stays
   disabled until the worker is ready. Verify Lambda readiness and `/api/health` before deploying
   the prebuilt frontend with the Vercel CLI.
5. Run final smoke checks and report the result through a GitHub deployment job referencing
   `staging`, with URL `https://stg.leonly.eduardov.dev`. Record image digests and Vercel deployment
   identity without secrets so the commit can be traced and rolled back.

## Acceptance Criteria

- A merge and a direct trusted push both trigger the release; Terraform has no manual approval gate.
- Releases are serialized across infrastructure, migrations, and apps. Do not cancel an active
   release halfway through mutation; pending releases cannot overwrite newer deployed commits.
- Failed checks/migrations stop dependent deployment. Backend verification failure blocks Vercel;
   final smoke failure marks the GitHub deployment unsuccessful, including partial-release details.
- AWS uses short-lived OIDC credentials scoped to this environment. Fork PRs cannot deploy or
   access provider credentials; Actions permissions are limited to each job's needs.
- Re-running a release is safe, artifacts share one commit, and build/verification success is not
   reported as deployment success before smoke checks pass.

Starting points: `.github/workflows/api-verify.yml`, `.github/workflows/web-app-verify.yml`,
and `packages/database/package.json` (`prisma:migrate` runs `prisma migrate deploy`).
