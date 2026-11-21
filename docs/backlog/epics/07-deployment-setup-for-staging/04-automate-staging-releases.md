# 04. Automate Staging Releases

**Prerequisites:** Protected staging access, provisionable infrastructure, runtime secrets, and a
Vercel staging project.

## User Story

As a developer, I want passing changes merged to `staging` deployed and verified automatically so
the GitHub deployment result reflects a usable release.

## Work to do

1. Run API, worker, web, and Terraform checks on PRs targeting `staging` without deployment
   credentials. Use stable required-check names and preserve the existing verification gates.
2. On merge, verify and build the exact release commit with pinned tools and lockfile installs.
   Allow a manual rerun of a selected trusted release. Serialize releases across infrastructure,
   migrations, and applications; do not cancel an active mutation or let older pending releases
   overwrite newer deployments. Serialize backend preparation because Prisma generation is shared.
3. Build and push API and worker images tagged with the commit SHA, capture their digests, and
   create authenticated Terraform plans only in the trusted release context. Apply each exact saved
   plan automatically; keep secret-bearing plans private and ephemeral.
4. Apply prerequisite infrastructure changes, run Prisma migrate-deploy with the direct Neon URL,
   and publish and promote the selected Lambda versions, worker before API when both change. Verify
   Lambda readiness and `/api/health` before deploying the prebuilt frontend with the Vercel CLI.
5. Run deterministic smoke checks and report the result in GitHub Deployments for `staging` at
   `https://stg.leonly.eduardov.dev`. Record commit, image digests, and Vercel deployment ID without
   secrets. Document investigation and rollback using retained compatible artifacts.
6. Verify HTTPS, interactive Google sign-in, authenticated requests, and image upload processing
   through SQS and the worker. Exercise backend and final smoke failures and application rollback;
   review real usage and billing after a representative test period.

## Acceptance Criteria

- Required PR checks gate merges; a merged commit triggers one serialized deployment. AWS access
  uses scoped short-lived OIDC credentials, and fork PRs cannot deploy.
- Failed checks, migrations, or backend verification stop dependent steps. Final smoke failures and
  partial releases are reported as failures, never as successful deployments.
- Reruns are safe, all artifacts identify the same commit, and retained image digests and Vercel
  deployment IDs support rollback. Application rollback does not reverse migrations, delete data,
  or restore old Terraform state.
- Real staging authentication, uploads, and image processing work. Google consent/login remains a
  manual first-deployment check rather than requiring personal credentials in CI.
- Durable instructions cover release order, investigation, rollback, separate state recovery, and
  safe staging pause; actual usage and the limitations of budget alerts are documented.

Starting points: `.github/workflows/ci-verify-api.yml`, `.github/workflows/ci-verify-workers.yml`,
`.github/workflows/ci-verify-web-app.yml`, `.github/workflows/ci-verify-terraform-staging.yml`, and
`packages/database/package.json`.
