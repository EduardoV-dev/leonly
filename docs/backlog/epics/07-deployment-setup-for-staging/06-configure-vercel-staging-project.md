# 06. Configure the Vercel Staging Project

**Prerequisites:** Vercel access/plan eligibility and the agreed API and frontend URLs.

## User Story

As a developer, I want a dedicated Vercel staging project so the frontend deploys independently
from future production, after GitHub Actions verifies the backend.

## Information needed

- Vercel account/team ID, deployment token, repository connection, and new project name/ID.
- Project root `apps/web-app`, pnpm workspace settings, and the supported Node.js version.
- `NEXT_PUBLIC_SITE_URL=https://stg.leonly.eduardov.dev` and
  `NEXT_PUBLIC_API_BASE_URL=https://api.stg.leonly.eduardov.dev` without `/api`.

## Work to do

1. Create a staging-only Vercel project, preferably through Terraform. Configure the monorepo root
   and Next.js build so shared workspace dependencies resolve correctly.
2. Set the project's Production Branch to `staging`. Its Production environment represents this
   staging project's primary deployment, not the future production application.
3. Disable native automatic Git deployments for this project so pushes cannot bypass backend
   verification or compete with the GitHub Actions release.
4. Configure the staging frontend variables and any other required settings found in the app's
   existing environment boundary. Keep database, OAuth, and storage secrets on the backend.
5. Complete domain assignment and build through the Vercel CLI with the selected project settings.
   GitHub Actions will deploy the prebuilt output only after backend verification.

## Acceptance Criteria

- A clean CI build works from the monorepo using staging values available at build time.
- The project ID/team ID and deployment token are available through GitHub environment settings.
- Git pushes alone do not trigger a competing Vercel deployment.
- A CI-triggered deployment serves `stg.leonly.eduardov.dev` and targets the staging API.
- Vercel Hobby eligibility and usage limits are confirmed before relying on a $0 frontend cost.

References: [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration),
[Vercel with GitHub Actions](https://vercel.com/docs/git/vercel-for-github).
