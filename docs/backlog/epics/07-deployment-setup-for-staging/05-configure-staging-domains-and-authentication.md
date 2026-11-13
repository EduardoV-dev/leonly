# 05. Configure Staging Domains and Authentication

**Prerequisites:** API Gateway configuration, Cloudflare zone access, and Google OAuth access.
Complete frontend domain assignment once the Vercel staging project exists.

## User Story

As a staging tester, I want HTTPS and Google sign-in on stable staging URLs so authentication and
uploads behave like a deployed application.

## Information needed

- Cloudflare zone ID for `eduardov.dev` and permission to manage the required DNS records.
- Frontend `stg.leonly.eduardov.dev` and API `api.stg.leonly.eduardov.dev`.
- Google project/consent configuration, staging OAuth client credentials, and allowed test users.
- Stable private `BETTER_AUTH_SECRET` and the Vercel project's required domain verification records.

## Work to do

1. Configure the API Gateway regional custom domain and matching ACM certificate in `us-east-1`.
   Manage certificate validation and API DNS in Cloudflare through Terraform.
2. Assign the frontend domain to Vercel and use its required DNS records. Verify certificate
   coverage for the nested hostname; do not assume Cloudflare's default wildcard covers it.
3. Register the exact Google callback
   `https://stg.leonly.eduardov.dev/api/auth/callback/google`. Configure consent/test-user access
   and client settings for this staging origin.
4. Set `WEB_APP_ORIGIN=https://stg.leonly.eduardov.dev` and verify shared cookie scope
   `BETTER_AUTH_COOKIE_DOMAIN=stg.leonly.eduardov.dev` against the frontend auth proxy and direct API
   requests. Verify secure cookies, CORS, and CSRF behavior with credentials.
5. Allow only the staging frontend origin for R2 browser uploads. Verify login, callback, session
   reuse, logout, and rejected untrusted origins in a real browser.

## Acceptance Criteria

- Both hostnames serve valid HTTPS; Google sign-in returns to the staging frontend.
- Authenticated frontend requests reach the API after the proxied login completes.
- Cookie scope does not use `.eduardov.dev` or `.leonly.eduardov.dev`; production authentication
   must later be designed to avoid sending production cookies to staging subdomains.
- R2 uploads work from the allowed origin; no public bucket access or secret values reach browsers.

Reference: [current auth configuration](../../../../apps/api/README.md#google-sign-in).
