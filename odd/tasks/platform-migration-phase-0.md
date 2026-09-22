# Platform Migration Phase 0: Freeze and Inventory

## Objective

Prepare an honest, approval-gated Phase 0 tracker for the platform migration. This tracker records
what must be confirmed before migration code begins; it does not authorize or report implementation.

## Problem

The migration cannot safely begin until current behavior is frozen, the complete runtime surface is
receipted, critical choices have explicit owners and approvals, and the existing application baseline
is verified.

## Why

Phase 0 of the migration plan requires frozen contracts and owned unknowns before later migration
phases can begin. Skipping that evidence risks changing behavior, losing rollback capability, or
starting a later phase without its predecessor's exit gate.

## Scope

Limited exclusively to Phase 0, "Freeze and inventory", in
`docs/architecture/platform-migration/migration-plan.md`. This document plans confirmation,
inventory, receipts, decisions, ownership, verification, and review. It does not implement a
migration, select technologies, create a checkpoint, or begin any later phase.

## Constraints

- Every implementation decision requires the user's prior opinion, decision, and explicit approval.
  Approval must not be inferred from silence.
- Feature work remains frozen until the final decommission gate passes.
- Stop before a migration batch reaches 800 changed textual lines. Count additions and deletions across
  all textual artifacts; an indivisible exception requires explicit approval before work begins.
- No later migration phase may begin until the Phase 0 exit gate passes.
- Record receipts without secrets.
- This is documentation-only planning. An approval receipt checkpoint may be created only after the
  user's explicit approval; it does not authorize implementation.

## Delivery Strategy

- Strategy: `ask-on-risk`.
- TDD: unknown. No test runner is resolved for this tracker; no test execution is claimed.
- Route policy: use `delegated` for repository inventory because mapping the required surface triggers
  at 4 or more files. Use `inline` only for bounded documentation reconciliation. Approval, operational
  ownership, and verification decisions remain user-gated rather than being inferred from a route.

## Tasks

- [x] **PM0-001 — Confirm baseline and feature freeze**
  - Route: user approval required.
  - Trigger evidence: Phase 0 work item "Declare the feature freeze and identify the last accepted
    behavior commit."
  - Action: identify the proposed last accepted behavior commit and request explicit confirmation that
    feature work is frozen.
  - Acceptance: the user explicitly approves the baseline commit and freeze status; the confirmation
    is recorded as a receipt without asserting an unapproved result.
  - Applicable checks: inspect the proposed baseline commit and working-tree state; no implementation
    checks apply.

- [x] **PM0-002 — Produce repository inventory receipt**
  - Route: `delegated`.
  - Trigger evidence: the required mapping covers Next.js routes, Supabase RPCs, direct table queries,
    storage operations, cron, secrets, external callbacks, and behavior for seven capability groups;
    this is a 4+ file repository mapping.
  - Action: inventory the required surface and record every capability with its owner and intended
    migration phase.
  - Acceptance: an evidence-backed, secret-free receipt maps every current capability to an owner and
    migration phase, with unresolved entries explicitly marked.
  - Applicable checks: completeness review against the Phase 0 inventory list; sample source-to-receipt
    traceability review.

- [x] **PM0-003 — Produce database and object-count receipts**
  - Route: user approval required.
  - Trigger evidence: Phase 0 requires current database row counts and R2-source object counts by
    prefix.
  - Action: request authorization for count collection, then record timestamped row and object counts
    by the approved scope and prefixes.
  - Acceptance: receipts contain source, command identifier, timestamp, count scope, and results, with
    no secrets.
  - Applicable checks: receipt schema review and reconciliation of requested tables and object prefixes.

- [ ] **PM0-004 — Resolve authentication decision group (in progress)**
  - Route: user approval required.
  - Trigger evidence: Phase 0 explicitly requires an authentication decision.
  - Action: present evidence and the decision boundary for the user's opinion, decision, and explicit
    approval.
  - Acceptance: the decision is either explicitly approved with an owner or explicitly recorded as a
    blocker for the next phase.
  - Applicable checks: decision record completeness and explicit-approval evidence.

- [x] **PM0-005 — Resolve PostgreSQL access decision group (complete; exact grants gated)**
  - Route: user approval required.
  - Trigger evidence: Phase 0 explicitly requires a PostgreSQL access decision.
  - Action: record the user's explicit least-privilege PostgreSQL access, ORM, migration-workflow,
    hybrid Prisma model plus versioned custom SQL source-of-truth, and operational-maintainer
    accountability decisions, then present the remaining detailed schema and concrete role-definition and
    grant boundaries for approval.
  - Acceptance: approved access boundaries, least-privilege migration and runtime role boundaries,
    Prisma workflow, schema source-of-truth model, and operational-maintainer accountability assignment
    are receipted; detailed schema content and concrete role definitions and grants are explicitly
    approved with an owner or recorded as blockers for the next phase.
  - Applicable checks: decision record completeness and explicit-approval evidence.

- [x] **PM0-006 — Resolve NestJS deployment decision group (complete; pre-cutover targets gated)**
  - Route: user approval required.
  - Trigger evidence: Phase 0 explicitly requires a NestJS deployment decision.
  - Action: record the user's explicit AWS Lambda container-image runtime decision for all NestJS HTTP API
    traffic and jobs, API Gateway HTTP API with Lambda proxy integration ingress approval, Express as the
    NestJS Lambda implementation adapter, Standard Amazon SQS with a dead-letter queue (DLQ) as the eventing
    and job platform for independently processed image jobs. Record an event source batch size of 1 message
    per Lambda invocation, maximum Lambda consumer concurrency of 5, and `ReportBatchItemFailures` enabled for the event source mapping. Record the serverless-safe request and job-design boundaries and approved SQS visibility
    timeout of 90 seconds; `maxReceiveCount` of 3 total receives; DLQ redrive allow policy restricted to
    the matching source queue; source-queue retention of 4 days; DLQ retention of 14 days; and manual,
    operator-approved replay only. On the first DLQ message, an assigned operator alerts, inspects the
    error, logs, and payload, fixes the root cause, and replays only explicitly approved idempotent jobs.
    Permanently invalid jobs remain recorded and do not loop. Image-processing handlers must be idempotent
    because Standard SQS provides at-least-once delivery and does not guarantee ordering. Record CloudWatch as the sole operator-facing observability platform for AWS metrics, logs, X-Ray traces, and application OpenTelemetry telemetry. Record Neon metrics and PostgreSQL logs as optionally exported through Neon's OpenTelemetry integration, with Neon-native diagnostics remaining in Neon. Then present remaining operational,
    AWS US East (N. Virginia), `us-east-1`, is approved for Lambda, SQS, and CloudWatch resources, co-located with the current Neon project. Record the approved no-customer-VPC,
    outbound-only networking boundary: NestJS uses Neon's pooled runtime endpoint over TLS, AWS services use their managed endpoints, R2 retains its existing private/authenticated path, and no inbound database access is permitted. A VPC, NAT Gateway, or fixed-egress design requires separate approval if later required. Record the approved deployment process: CI/CD only; short-lived GitHub Actions OIDC credentials; CI-built and validated Lambda images pushed as immutable ECR digests in `us-east-1`; versioned infrastructure as code; explicit production-environment approval before activation; Lambda version or alias rollback; and forward-only database migrations. Record the approved operational boundary: the user is the interim owner for AWS Lambda, API Gateway, ECR, SQS/DLQ, CloudWatch, and Neon/PostgreSQL; the user holds deployment approval, rollback authority, and DLQ replay authority; no numeric SLO, RTO, or RPO is approved yet; and provider-plan or baseline evidence plus a named operator and incident path are required before cutover. Then present any remaining pre-cutover target evidence for
    approval.
  - Acceptance: the AWS Lambda container-image runtime, API Gateway HTTP API with Lambda proxy integration
    ingress, Express as the NestJS Lambda implementation adapter, Standard Amazon SQS with a DLQ for independently processed image jobs, an event source batch size of 1 message per Lambda invocation, maximum Lambda consumer concurrency of 5, `ReportBatchItemFailures` enabled, and the maximum of 3
    total job attempts with exponential backoff and jitter, the 15-second Lambda execution timeout, SQS
    visibility timeout of 90 seconds, `maxReceiveCount` of 3 total receives, DLQ redrive allow policy
    restricted to the matching source queue, source-queue retention of 4 days, DLQ retention of 14 days,
    manual operator-approved replay boundaries, image-handler idempotency requirements, and the requirements for no in-process durable background
    work and bounded invocation execution are receipted. CloudWatch-only observability, the Neon diagnostic boundary, the approved AWS region, and the no-customer-VPC outbound-only networking boundary are receipted. Remaining operational design,
    operational ownership is explicitly approved, while numeric targets are intentionally unclaimed until evidence exists, and any remaining pre-cutover requirements are explicitly
    approved with an owner or recorded as blockers for the next phase.
  - Applicable checks: decision record completeness and explicit-approval evidence.

- [x] **PM0-007 — Resolve private media delivery decision group**
  - Route: user approval required.
  - Trigger evidence: Phase 0 explicitly requires a private media delivery decision.
  - Action: present evidence and the decision boundary for the user's opinion, decision, and explicit
    approval.
  - Acceptance: the decision is either explicitly approved with an owner or explicitly recorded as a
    blocker for the next phase.
  - Applicable checks: decision record completeness and explicit-approval evidence.

- [ ] **PM0-008 — Assign operational SLO, RPO, and rollback ownership**
  - Route: user approval required.
  - Trigger evidence: Phase 0 requires availability, acceptable maintenance duration, recovery point,
    and rollback window.
  - Action: obtain explicit owners and approvals for service objectives, recovery point objective,
    maintenance duration, rollback window, and rollback responsibility.
  - Acceptance: each operational target and rollback responsibility has an explicitly approved owner;
    unknown targets block the next phase.
  - Applicable checks: ownership and approval evidence review; operational target completeness review.

- [ ] **PM0-009 — Verify the existing application baseline**
  - Route: user approval required.
  - Trigger evidence: the Phase 0 exit gate requires existing application verification to pass before
    migration code begins.
  - Action: run the approved baseline checks in a clean checkout of baseline commit `98e71d8` and retain
    command, tool-version, timestamp, exit-status, and secret-free result-summary receipts.
  - Acceptance: approved baseline verification results are recorded, or failures block migration code.
  - Applicable checks: `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
    `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`.

- [ ] **PM0-010 — Review Phase 0 exit gate and request approval**
  - Route: user approval required.
  - Trigger evidence: the exit gate requires owner and phase coverage, resolved or explicitly blocking
    critical decisions, and passing existing-application verification.
  - Action: reconcile the bounded documentation evidence inline, present the complete exit-gate status,
    and request explicit approval to proceed or remain blocked.
  - Acceptance: all exit-gate criteria have evidence and the user explicitly approves the outcome; no
    checkpoint is created by this task.
  - Applicable checks: inline documentation reconciliation, receipt completeness review, and explicit
    approval evidence.

## Acceptance Criteria

- Every Phase 0 capability has an owner and intended migration phase.
- Authentication, PostgreSQL access, NestJS deployment, and private media delivery are explicitly
  approved or explicitly recorded as blockers.
- Availability, maintenance duration, recovery point, rollback window, and operational ownership are
  explicitly approved or explicitly recorded as blockers.
- Baseline verification evidence is available and passes before migration code begins.
- The user explicitly approves the Phase 0 exit-gate outcome before any later phase begins.

## Applicable Checks

- Documentation reconciliation is bounded and may be performed inline.
- Repository inventory uses the delegated route because it meets the 4+ file mapping trigger.
- Count, decision, operational, baseline-verification, and exit-gate actions require explicit user
  approval before execution or acceptance.
- TDD and a test runner remain unknown for this tracker; no passing check is claimed here.

## Progress

- Status: in progress, approval-gated.
- PM0-001 is complete: the user explicitly approved baseline commit `98e71d8` and confirmed the
  feature freeze. Approval receipt: `docs/architecture/platform-migration/checkpoints/001-phase-0-baseline-freeze.md`.
- PM0-002 is complete: the user explicitly approved the inventory and the secret-free receipt is at
  `docs/architecture/platform-migration/inventory-receipt.md`. Every current owner is `pending user
  assignment`; phases not stated by the approved plan are `pending user decision`.
- PM0-003 is complete: the secret-free count receipt is at
  `docs/architecture/platform-migration/count-receipt.md`; it records exact public application-table
  counts and `memory-photos` object counts by the observed `memories/` and `temporary/` path families.
- PM0-004 is in progress: the user explicitly approved a platform-migration strategy that supersedes
  the prior operational Phase 2 authentication activation. Construct and validate the full target
  architecture in parallel with the deployed production architecture, including Better Auth, NestJS,
  Neon, and data migration. Phase 2 may support target construction, but Better Auth activates only at
  the single replacement cutover that replaces the current deployed architecture. No partial production
  activation or transitional authorization bridge is approved. The user had also explicitly selected
  Better Auth and Neon as the persistence location for Better Auth account and session records. The
  directional decision receipt is at `docs/architecture/platform-migration/auth-decision-receipt.md`.
  The user also explicitly selected `Verified email exact match` as the existing-user Better Auth
  account-linking criterion and approved comparing Google verified-email domains case-insensitively by
  lowercasing only the domain while preserving the local part exactly. When a Better Auth Google verified
  email does not resolve to exactly one eligible existing `users.id`, the approved policy is deny sign-in and
  block cutover until the mapping is resolved during pre-cutover validation. Any other matching normalization,
  provider-specific local-part transformation and implementation or cutover
  details remain unapproved and must not be inferred.
  The user explicitly approved reactivating a soft-deleted account when the Google identity maps to exactly one existing user; no account creation or merging is permitted. The user explicitly approved stable Google provider-subject identity after initial mapping: update `users.email` only when unused, preserve the existing stored email on collision, and never relink, create, or merge accounts. The user explicitly approved a cutover prerequisite: before cutover, identity mappings must be
  precomputed and validated. A legacy identity that does not map to exactly one eligible existing user
  blocks cutover until fixed manually; normal Google-only users must experience no sign-in change.
  The user explicitly chose to preserve existing Google-only sign-in behavior and declined new
  authentication methods. At the future Better Auth cutover, the user explicitly approved invalidating
  Supabase sessions and requiring users to sign in again with Google; the user explicitly rejected a
  temporary Supabase/Better Auth session bridge.
  The user explicitly approved the target authentication design: NestJS exclusively hosts Better Auth's
  Google-only authentication endpoints; Better Auth uses Prisma-managed authentication tables in Neon;
  existing `public.users` records remain the application identity and authorization records; a one-to-one
  immutable Better Auth user-to-`users.id` mapping is used for API authorization; and the browser calls
  NestJS authentication endpoints only, with no database access or PostgreSQL role. The user is the
  interim owner for target authentication design approval, identity-mapping resolution approval, and
  cutover authorization. PM0-004 remains in progress because the detailed cutover plan, production
  activation criteria, named operational delegate, and incident path remain unresolved.
  This strategy authorizes neither target implementation nor Better Auth implementation, NestJS or
  Neon provisioning, data-migration execution, an account-linking behavior beyond this explicit
  conflict policy, any RLS bridge or rewritten RLS policy implementation, the pre-cutover identity-mapping resolution process, a
  any runtime recovery flow, any implementation of the rejected temporary Supabase/Better Auth session bridge,
  scope beyond current Google-only authentication, operational targets or ownership, cutover design or
  a cutover plan, or cutover execution; each remains blocked pending separate explicit approval.
- PM0-005 is complete as an access-boundary decision: the user explicitly approved these target PostgreSQL least-privilege
  boundaries and workflow: only NestJS accesses Neon at runtime through a pooled connection; NestJS
  uses Prisma ORM for typed runtime PostgreSQL access through a separate restricted runtime role with
  only the database permissions necessary for the deployed application; Prisma owns the migration
  workflow through a separate direct connection and a migration role with DDL privileges only; and
  browsers receive no database role or PostgreSQL access. The user also explicitly approved the hybrid
  Prisma model plus versioned custom SQL schema source-of-truth approach: `schema.prisma` is
  authoritative for application models Prisma supports, while Prisma migration history, including
  reviewed custom SQL, is authoritative for PostgreSQL-native objects Prisma cannot model, including
  extensions, functions, grants, and specialized indexes; RLS policies are not carried into the target Neon design. Both sources must evolve
  together. The decision receipt is at
  `docs/architecture/platform-migration/postgresql-decision-receipt.md`. This decision preserves the
  approved full parallel-build, single-cutover strategy. The user is the PostgreSQL/Neon operational
  maintainer throughout the migration until they explicitly delegate that responsibility. They are
  accountable for roles, grants, backups, migration access, and incident response. This assignment
  establishes accountability only. It does not authorize provisioning; creation of credentials, roles, or
  grants; implementation; migration execution; backup execution; or cutover work. Exact table verbs and function grants remain implementation-gated
  and must be derived from actual API and job usage before grant SQL is written or executed.
- The user explicitly reviewed and approved the original `707 additions + 0 deletions = 707`
  documentation-only batch. Review-record lines added afterward are excluded from that accepted
  batch accounting. Future Phase 0 work begins a separate, unapproved batch.
- PM0-006 is complete as an approval record, with numeric target evidence and pre-cutover assignment details gated: the user explicitly chose AWS Lambda container images as the serverless runtime
  for all NestJS HTTP API traffic and jobs, and API Gateway HTTP API with Lambda proxy integration as the
  ingress for the NestJS API running in those images, and Express as the NestJS Lambda implementation
  adapter, and Standard Amazon SQS with a dead-letter queue (DLQ) for independently processed image jobs. The SQS event source batch size is 1 message per Lambda invocation, with maximum Lambda consumer concurrency of 5 and `ReportBatchItemFailures` enabled. This supersedes
  the prior persistent-Node-process and generic managed-container API-hosting requirements. Request and job
  design must not rely on in-process durable background work and must keep invocation execution bounded. SQS
  visibility timeout is 90 seconds; `maxReceiveCount` is 3 total receives; the DLQ redrive allow policy is
  restricted to the matching source queue; source-queue retention is 4 days; and DLQ retention is 14 days.
  Replay is manual and operator-approved only: on the first DLQ message, an assigned operator alerts,
  inspects the error, logs, and payload, fixes the root cause, and replays only explicitly approved
  idempotent jobs. Permanently invalid jobs remain recorded and do not loop. Image-processing handlers must be idempotent because Standard SQS provides at-least-once delivery and does not guarantee ordering. CloudWatch is the sole operator-facing observability platform; Neon metrics and PostgreSQL logs may be exported through Neon OpenTelemetry, while Neon-native diagnostics remain in Neon. The decision receipt is at
  `docs/architecture/platform-migration/nestjs-deployment-decision-receipt.md`. This decision preserves
  the approved full parallel-build, single-cutover strategy. AWS US East (N. Virginia), `us-east-1`, is approved for Lambda, SQS, and CloudWatch resources, co-located with the current Neon project. The no-customer-VPC, outbound-only networking boundary is approved: NestJS uses Neon's pooled runtime endpoint over TLS, AWS services use their managed endpoints, R2 retains its existing private/authenticated path, and no inbound database access is permitted. The deployment process is approved as CI/CD-only with short-lived GitHub Actions OIDC credentials, immutable ECR image digests in `us-east-1`, versioned infrastructure as code, explicit production approval, Lambda version or alias rollback, and forward-only database migrations. Remaining operational targets or ownership
  remain gated only for numeric target evidence and pre-cutover assignment details. It authorizes neither AWS, ECR, Lambda, SQS, or DLQ provisioning; IAM or credentials;
  Docker or NestJS implementation; traffic activation; nor cutover work. PM0-006 is complete as a decision record;
  numeric target evidence and pre-cutover assignment details
  operational decisions remain unresolved.
- PM0-007 is complete as a private-media delivery decision: NestJS issues five-minute, single-object R2
  presigned GET and PUT grants after authorization. The R2 bucket remains private, browsers receive no
  list or delete permission, and only ready `cover` and `detail` variants are served. Grants are treated
  as bearer tokens, with no grant logging or public edge cache; NestJS retains metadata finalization and
  cleanup deletion. The approved decision receipt is at
  `docs/architecture/platform-migration/private-media-decision-receipt.md`. This decision authorizes
  neither R2 provisioning, credentials, CORS configuration, NestJS implementation, object copying, or
  cutover execution.
- PM0-008 remains incomplete: the user is the named primary operator until delegation and retains
  deployment approval, rollback authority, and DLQ replay authority. The approved incident path is
  CloudWatch alert, user assessment of logs and impact, mitigation or authorized rollback, then outcome
  recording. Numeric availability, maintenance-duration, RTO, RPO, and rollback-window targets remain
  blocked pending provider-plan and measured-baseline evidence. The decision receipt is at
  `docs/architecture/platform-migration/operational-ownership-decision-receipt.md`.
- PM0-009 is ready to execute: the user approved a clean checkout of baseline commit `98e71d8` and the
  existing CI-equivalent `web-app` check, typecheck, one-shot test, and build commands. Results remain
  unclaimed until run and receipted; failures block migration implementation until resolved and explicitly
  reviewed.
- PM0-010 remains incomplete. No migration implementation or baseline-verification result is claimed.

## Verification Evidence

| Check | Command or evidence | Result |
| --- | --- | --- |
| PM0-003 count receipt | Authenticated, read-only Supabase REST exact-count requests and paginated Storage list requests at `2026-09-19T17:41:49Z`; receipt: `docs/architecture/platform-migration/count-receipt.md`. | pass |
| Migration documentation batch accounting | Targeted per-file addition and deletion counts cover every migration documentation artifact in the uncommitted batch. | pass |
| PM0-004 persistence decision | User explicitly chose Neon for Better Auth account and session records; receipt: `docs/architecture/platform-migration/auth-decision-receipt.md`. | pass |
| PM0-005 PostgreSQL access, workflow, schema source-of-truth, and ownership decision | User explicitly approved least-privilege Prisma migration roles with DDL privileges only, restricted NestJS runtime roles with only deployed-application permissions, NestJS-only pooled Prisma runtime access, Prisma-owned migrations through a separate direct connection, no browser database role or PostgreSQL access, and the hybrid Prisma model plus versioned custom SQL approach: `schema.prisma` is authoritative for Prisma-supported application models; Prisma migration history, including reviewed custom SQL, is authoritative for PostgreSQL-native objects Prisma cannot model; both sources evolve together. The user is the PostgreSQL/Neon operational maintainer, accountable for roles, grants, backups, migration access, and incident response until explicitly delegated; this assignment authorizes no operational execution. Receipt: `docs/architecture/platform-migration/postgresql-decision-receipt.md`. | pass |
| PM0-006 NestJS deployment decision | User explicitly chose AWS Lambda container images as the serverless runtime for all NestJS HTTP API traffic and jobs, API Gateway HTTP API with Lambda proxy integration as the ingress for the NestJS API running in those images, Express as the NestJS Lambda implementation adapter, and Standard Amazon SQS with a dead-letter queue (DLQ) for independently processed image jobs. The SQS event source batch size is 1 message per Lambda invocation, with maximum Lambda consumer concurrency of 5 and `ReportBatchItemFailures` enabled. This supersedes persistent Node processes and generic managed-container API hosting. Request and job design must not rely on in-process durable background work and must keep invocation execution bounded. SQS visibility timeout is 90 seconds; `maxReceiveCount` is 3 total receives; the DLQ redrive allow policy is restricted to the matching source queue; source-queue retention is 4 days; and DLQ retention is 14 days. Replay is manual and operator-approved only, with first-message alerting, assigned-operator inspection and root-cause remediation, and replay limited to explicitly approved idempotent jobs. Permanently invalid jobs remain recorded and do not loop. Image-processing handlers must be idempotent because Standard SQS provides at-least-once delivery and does not guarantee ordering. CloudWatch-only observability is approved; Neon metrics and PostgreSQL logs may be exported through Neon OpenTelemetry, while Neon-native diagnostics remain in Neon. AWS US East (N. Virginia), `us-east-1`, is approved for Lambda, SQS, and CloudWatch resources, co-located with the current Neon project. The no-customer-VPC, outbound-only networking boundary is approved: NestJS uses Neon's pooled runtime endpoint over TLS, AWS services use their managed endpoints, R2 retains its existing private/authenticated path, and no inbound database access is permitted. The deployment process is approved as CI/CD-only with short-lived GitHub Actions OIDC credentials, immutable ECR image digests in `us-east-1`, versioned infrastructure as code, explicit production approval, Lambda version or alias rollback, and forward-only database migrations. Remaining operational targets or ownership remain unresolved. Receipt: `docs/architecture/platform-migration/nestjs-deployment-decision-receipt.md`. | pass |
| PM0-006 operational ownership and target boundary | User explicitly approved interim ownership for AWS Lambda, API Gateway, ECR, SQS/DLQ, CloudWatch, and Neon/PostgreSQL, including deployment approval, rollback authority, and DLQ replay authority. Numeric SLO, RTO, and RPO values remain intentionally unclaimed until provider-plan and baseline evidence exist; operator, incident path, and measurable pre-cutover targets are required before cutover. | pass |
| Original documentation batch review | User explicitly reviewed and approved the original 707-line documentation-only batch; later review-record lines are excluded from its accounting. | pass |

No application baseline verification has been run; PM0-009 remains pending.

## Next Step

Begin a new, unapproved documentation batch only when presenting the remaining PM0-004, PM0-007, or
  PM0-008 boundaries for explicit approval. For PM0-005, exact table verbs and function grants remain
  implementation-gated. For PM0-006, SQS/DLQ operational settings and manual,
  operator-approved replay, maximum consumer concurrency, partial-batch failure-handling, and CloudWatch-only observability are approved; remaining operational,
  Deployment process and operational decisions remain unresolved. Do not begin
  another Phase 0 task or any later phase without the required
approval.
