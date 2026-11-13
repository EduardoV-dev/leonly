# 03. Provision Staging Data Services

**Prerequisites:** verified provider access and protected Terraform state.

## User Story

As a developer, I want isolated staging database, Redis, and upload storage so testing cannot
change production data.

## Information needed

| Service | Required inputs |
| --- | --- |
| Neon | Organization ID/API key, project/database names, PostgreSQL version matching the application, and `aws-us-east-1`. |
| Upstash | Provisioning credentials, region, database name, and available free-plan allowance. |
| R2 uploads | Cloudflare account ID/token, private bucket name, and bucket-scoped object credentials for API and worker. |

## Work to do

1. Add a pinned Neon provider and create a dedicated `leonly-staging` project with an application
   database and plan-compatible compute/scale-to-zero settings. Explicitly set organization and
   region; Neon documents the community-maintained `kislerdm/neon` provider.
2. Configure separate migration, API, and worker roles with appropriate SQL grants. Use pooled URLs
   for runtime traffic and a direct URL for Prisma migrations. Supply grants through versioned SQL
   in the owning migration/setup process rather than assuming role creation grants table access.
3. Provision isolated Upstash Redis through its supported Terraform provider. Capture its REST URL
   and token. If no free database slot is available, resolve the budget before enabling a paid plan.
4. Extend the existing staging R2 upload bucket with the exact frontend upload origin. Keep it
   private and separate from state; scope API/worker object credentials to this bucket.
5. Protect persistent resources from accidental Terraform destruction. Wire service connection
   values into private deployment configuration and document which ones enter Terraform state.

## Acceptance Criteria

- Terraform provisions the staging services without manual Neon database creation.
- API and worker access works with their required privileges; migration credentials are not used
   as application credentials. Follow existing worker grants documented in `infra/README.md`.
- Redis isolation, R2 private access, and browser upload CORS are verified.
- Free-plan limits and shared allowances are recorded; no automatic paid upgrade is assumed.
- Prisma's existing migrations remain the source of application schema changes. Do not add an
   unrequested cleanup worker or upload expiration policy.

References: [Neon Terraform](https://neon.com/docs/reference/terraform),
[Upstash Terraform](https://registry.terraform.io/providers/upstash/upstash/latest/docs),
[existing storage/worker setup](../../../../infra/README.md).
