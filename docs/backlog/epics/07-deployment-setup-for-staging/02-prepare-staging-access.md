# 02. Prepare Staging Access

**Prerequisites:** Administrative access to the staging provider accounts and GitHub repository.

## User Story

As the owner, I want to complete the one-time account and access setup so Terraform and GitHub
Actions can provision and deploy staging securely.

## Work to do

1. Confirm AWS, Neon, Upstash, Cloudflare, Google OAuth, and Vercel access, regions, free-plan
   eligibility, and capacity. Resolve any paid-plan requirements before incurring charges.
2. Bootstrap a dedicated private, encrypted, versioned S3 state bucket in `us-east-1`, with public
   access blocked and retention for previous versions. Record its ownership and protect any local
   bootstrap state. Keep it separate from application uploads.
3. Create GitHub's AWS OIDC deployment role, scoped to this repository and the `staging` environment.
   Grant state and lockfile access; provision resource-management permissions as infrastructure is
   introduced. Use short-lived credentials instead of GitHub-stored AWS access keys.
4. Create the GitHub `staging` environment; configure provider credentials and identifiers as
   environment secrets or variables. Add runtime credentials after their resources exist. Restrict
   deployment access and protect `staging` from direct pushes; require the API, worker, web, and
   Terraform PR checks.
5. Prepare Google consent, staging OAuth credentials and test users, a stable Better Auth secret,
   Cloudflare zone access, and Vercel account access. Register the callback
   `https://stg.leonly.eduardov.dev/api/auth/callback/google`.

## Acceptance Criteria

- Local and trusted GitHub runs can access the same protected state bucket and lockfile; staging
  and production credentials remain separate, and local Floci state is unaffected.
- The state bucket's ownership, version retention, lock recovery, and isolated version restoration
  are documented and verified. Competing state writes are blocked.
- Deployment access uses scoped OIDC credentials, and fork PRs cannot access deployment secrets.
- Branch protection requires the four verification checks and blocks direct pushes.
- Provider access, account limits, and remaining runtime credentials are recorded without exposing
  secrets. Interactive Google sign-in is available to authorized test users.

See [the deployment guide](../../../operations/deployment-guide.md) and
[infrastructure setup](../../../../infra/README.md).
