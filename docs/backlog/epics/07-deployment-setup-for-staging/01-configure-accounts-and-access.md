# 01. Configure Accounts and Access

## User Story

As the owner, I want deployment access configured once so GitHub Actions can provision staging
without sharing credentials in source code or chat.

## Information needed

All service accounts except the new Vercel project already exist. Collect identifiers below; store
secret values in GitHub's `staging` Environment or an ignored local credential store.

| Account | Information and access needed |
| --- | --- |
| GitHub | Repository owner/name, administrator access, `staging` branch, and a notification email for failures/budget alerts. |
| AWS | Target account ID, `us-east-1`, initial provisioning access, and a GitHub OIDC deployment role ARN. |
| Cloudflare | Account ID, `eduardov.dev` zone ID, token for the required R2/DNS provisioning operations, and separate R2 state/object credentials. |
| Neon | Organization ID, `NEON_API_KEY`, organization plan, and available project quota. |
| Upstash | Account/API provisioning credentials, plan/free database availability, and chosen region near `us-east-1`. |
| Google Cloud | Project ID, consent-screen settings/test users, and a staging web OAuth client's ID and secret. |
| Vercel | Account/team ID, deployment token, eligible plan, and the new staging project ID once created. |

## Work to do

1. Confirm the target accounts, plan limits, and existing resources before creating anything. Check
   Vercel Hobby's personal/non-commercial eligibility and Upstash's free database availability.
2. Configure GitHub branch protection for `staging`: block direct pushes and require PRs with the
   frontend, backend, and Terraform checks passing before merge. Restrict workflow changes.
3. Create the GitHub `staging` Environment restricted to the `staging` branch, without a separate
   deployment approval requirement.
4. Bootstrap AWS OIDC trust for this repository and environment. Scope the deployment role to the
   required staging resources; application Lambdas use separate runtime roles.
5. Document exact GitHub secret/variable names and provider permissions as implementations select
   them. Keep R2 backend credentials separate from real AWS provider credentials.
6. Verify read-only account access and record a cost estimate. Standard GitHub-hosted runners are
   free for this public repository; larger runners and other billable features are excluded.

## Acceptance Criteria

- Every account has an identified owner, required IDs, and a verified access path.
- GitHub blocks direct pushes and merges with missing or failing required checks on `staging`.
- Fork PR checks cannot receive deployment secrets or assume the AWS deployment role.
- Credentials, state, and secret-bearing plans cannot enter public commits, logs, or artifacts.
- The $5 target has documented assumptions and a decision before any paid-plan upgrade.

References: [GitHub OIDC](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services),
[Vercel Hobby](https://vercel.com/docs/plans/hobby).
