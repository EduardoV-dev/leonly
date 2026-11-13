# 08. Verify Staging and Rollback

**Prerequisites:** the first complete staging deployment and retained previous release artifacts.

## User Story

As the owner, I want proof that staging works and can recover from a bad release so deployment
success means usable software rather than a successful upload.

## Information needed

- Authorized Google test account, a small test image, and access to application/worker logs.
- Previous API/worker image digests, Vercel deployment ID, and protected Terraform state backup.
- Billing access, alert destination, and current shared free-tier consumption for each provider.

## Work to do

1. Verify HTTPS, Google sign-in/logout, authenticated API requests, and rejected untrusted origins.
   Create a memory with an upload; confirm processing completes through SQS and the image worker.
2. Add deterministic release smoke checks for health and applicable user flows. Keep interactive
   Google consent/login verification as a documented manual first-deployment check, not a fragile
   automated browser login that requires personal credentials in CI.
3. Exercise a failed backend readiness check and a failed final smoke check. Confirm frontend
   blocking, accurate GitHub deployment status, and usable diagnostics for partial releases.
4. Roll back application artifacts using retained compatible image digests through Terraform and
   the prior Vercel release. Do not reverse migrations, delete data, or restore old Terraform state
   as an application rollback; state backup recovery is a separate operation.
5. Check real usage/bills after a representative test period. Account for ECR, SQS polling, logs,
   API traffic, data transfer, R2 operations/storage, and shared allowances. Document the $5 target,
   cold-start/free-quota tradeoffs, alert limitations, and how to pause staging safely.

## Acceptance Criteria

- Health, authentication, uploads, and image-processing checks pass on the actual providers.
- A failed release can be located by commit and rolled back without losing stored data.
- A partial release stays visibly failed even if some components were already updated.
- Durable instructions under `infra/` cover bootstrap, credentials, release order, investigation,
   application rollback, and separate state recovery. Update the existing Terraform learning guide.
- The owner can explain every Terraform block and plan change; measured cost assumptions are
   recorded without presenting budget alerts as a guaranteed spending cap.
