## 1. Creation Lifecycle and Private Media

- [x] 1.1 Add a migration for authenticated memory-creation attempts and durable staged-photo records,
  including UUID idempotency uniqueness, normalized request fingerprinting, lifecycle constraints, RLS,
  retention metadata, and indexes. Do not add SQL test tasks.
- [x] 1.2 Extend the private `memory-photos` Storage policies and create security-reviewed RPCs so an
  authenticated available member can stage only tracked, active-space-scoped media through the server
  workflow; preserve unreadability before finalized memory/photo metadata exists.
- [x] 1.3 Implement the atomic finalization RPC that derives authorization from the session, persists the
  memory and ordered photo metadata, validates same-memory cover selection, records the completed
  idempotency result, and never accepts client-supplied space or creator authority.
- [x] 1.4 Implement server-side compensation and stale-stage cleanup that deletes tracked objects after
  failed or interrupted attempts while preserving inaccessible media and completed results.
- [x] 1.5 Verify the migration with `npx supabase db reset`; manually verify RLS, staged unreadability,
  creation finalization, and cleanup behavior without adding SQL tests.

## 2. Server Creation Boundary

- [x] 2.1 Add server-only create-memory validation for trimmed text boundaries, UUID idempotency keys,
  date-only values, IANA timezones, server-derived local dates, visibility, file count, file size, and
  byte-verified JPEG, PNG, and WebP content.
- [x] 2.2 Implement the authenticated multipart creation route or Server Action: reserve or resolve the
  idempotency attempt, stage validated uploads, finalize only after every upload succeeds, and return the
  created memory identifier or a safe retryable/field error.
- [x] 2.3 Keep object paths, privileged credentials, and internal lifecycle details off the browser
  boundary; use existing active-space and memory-detail authorization paths for the response contract.
- [x] 2.4 Add focused server and route tests for altered identity/space payloads, date and timezone
  boundaries, binary-content rejection, file limits, selection ordering, cover persistence, timeline/Vault
  visibility, upload and persistence compensation, concurrent duplicate attempts, and lost-response retry.

## 3. Create Memory Experience

- [x] 3.1 Add the authenticated create-memory route and dashboard/timeline entry point, following the
  established responsive app shell and Leonly form primitives.
- [x] 3.2 Build the accessible creation form for title, memory date, optional details, visibility, up to
  10 selected photos, and exactly one cover selection; retain photo selection order and omit reordering.
- [x] 3.3 Add a collocated form hook that performs client UX validation, creates and retains an
  idempotency key for an unchanged retry, submits single-flight multipart requests with progress, and
  preserves valid state after recoverable failures.
- [x] 3.4 Navigate successful timeline and Vault creations to the timeline route, and ensure a later
  timeline refresh includes only the newly created timeline memory.
- [x] 3.5 Add accessible component and route tests for field feedback, pending single-flight behavior,
  progress, cover selection, no-photo creation, retry retention, placement-specific navigation, and mobile
  and desktop form behavior.

## 4. Verification

- [x] 4.1 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
  `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`; resolve all failures.
- [x] 4.2 Strictly validate the completed OpenSpec change and verify that the final diff contains only
  US-004 implementation and planning artifacts.
