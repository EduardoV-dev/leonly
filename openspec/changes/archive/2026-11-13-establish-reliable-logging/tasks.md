# Tasks

Implementation tasks; keep each behavior's tests with its changes. These are implementation tasks
only; no deployment is authorized by this plan.

## 1. Shared diagnostic foundation

- [x] 1.1 Extend the shared logger options with service and environment identity; verify logger
      tests cover level defaults and record identity.
- [x] 1.2 Bound shared error serialization with the safe-field policy and truncation limits;
      verify sanitizer tests cover nested causes, secrets, personal content, callback URLs
      including fragments, cycles, unsafe getters, non-Error throws, multibyte strings, and
      preserved error identity after truncation.

## 2. API operational events

- [x] 2.1 Route Better Auth diagnostics through the shared logger using approved classifications
      and sanitized detail; verify diagnostics tests omit sessions, hostile callback URLs, and
      non-scalar arguments.
- [x] 2.2 Record failed dependency probes with dependency, duration, timeout classification, and
      sanitized error; verify health tests distinguish rejection, unhealthy results, and timeout
      while successful probes stay quiet and existing response contracts remain unchanged.
- [x] 2.3 Update publication, existing recovery, and owning-service bookkeeping/cleanup catches
      with explicit event/outcome/identifier/err fields without rethrow duplicates; verify outbox
      and owning-service tests preserve committed success, uncertain publication, and separate
      secondary failures.

## 3. Worker context and failure preservation

- [x] 3.1 Add record outcome fields (message/event/file identifiers, receive count, duration,
      outcome) to worker batch logging; verify batch tests cover malformed and valid mixed batches
      and absent optional metadata without raw payload logging.
- [x] 3.2 Preserve original causes in image/size/decoder error translation; verify recipe and
      processing tests retain cause evidence through normalization and shared serialization.
- [x] 3.3 Report failure-bookkeeping and lease-release failures as separate secondary events with
      sanitized err fields; verify worker failure tests assert the original code/cause remains
      primary and existing lease/ready-output/idempotency behavior is unchanged.

## 4. Documentation and checks

- [x] 4.1 Create the operational logging runbook with identity fields, the event catalog,
      sanitization bounds, and investigation queries; verify documented fields and examples match
      test records and include no raw request or personal data.
- [x] 4.2 Run backend CI gates sequentially (`check`, `typecheck`, `test:run`, `build`) on the
      completed state.

## Workflow follow-up

- Archive this change through the normal OpenSpec workflow after review.
- Preserve the operational runbook when the temporary backlog story is removed.
