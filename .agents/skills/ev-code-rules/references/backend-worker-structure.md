# Feature-Owned Worker Structure And Event Validation

Rule ID: `backend-worker-structure`.

Apply to background-worker applications, including queue consumers, scheduled jobs, and event-triggered
functions. Organize workers by business capability. Keep entry points thin, validate incoming messages
at runtime, and keep business operations independent of trigger-specific event types.
Resolve `src/` relative to the owning application/package. The paths and Zod examples target
TypeScript/JavaScript; use language-appropriate entry-point extensions and equivalent explicit runtime
schemas in other languages. Do not require a particular cloud provider, workspace name, or monorepo.

## Function Structure And Ownership

- Place each function under `src/functions/<function-name>/`, using descriptive kebab-case names.
- Keep `handler.ts` as the only file directly inside the function folder. Put supporting code in the
  responsibility groups below; create only groups the function needs, with no empty folders or
  forwarding-only layers.
- Treat everything in a function folder as private. Other functions must not import its implementation,
  schemas, types, constants, fixtures, or test helpers. Extract genuinely reused code to the appropriate
  application-wide module or shared package instead of importing another function's private files.
- Keep unit tests beside their subjects. Use `tests/` for entry-point tests, cross-module worker tests,
  fixtures, and shared function-local test support.

| Folder | Responsibility |
| --- | --- |
| `events/` | Trigger parsing, runtime message validation, event adaptation, and trigger-specific responses. |
| `services/` | Business workflows, transformations, and coordination of persistence or external effects. |
| `repositories/` | Persistence operations, transactions, and database-backed processing leases. |
| `tests/` | Entry-point and cross-module worker tests, fixtures, and test-only helpers. |

## Explicit Event Schemas

- Define incoming application-message contracts with Zod in descriptively named `*.schema.ts` files.
  Infer message types with `z.infer<typeof schema>`; do not maintain a handwritten interface for the
  same shape. Static types alone do not validate decoded messages.
- Validate the complete application message before invoking business operations. Pass the parsed result
  to the processor, including any schema transformations/defaults; never validate a value and then use
  the original unvalidated input.
- Keep Lambda events, SQS records, scheduler envelopes, and other trigger-specific types out of business
  services. Adapt them at the event boundary into validated business inputs.
- Preserve checks that schemas cannot establish, including ownership, current database state, and
  image-content validation. Producer-side validation does not replace consumer ingress validation.
- Choose unknown-field handling deliberately. In Zod 4, `z.object()` strips unknown fields,
  `z.strictObject()` rejects them, and `z.looseObject()` preserves them. Use equivalents supported by
  the installed Zod version and preserve the established contract when replacing a validator.

Choose schema ownership by actual consumers:

| Usage | Ownership |
| --- | --- |
| Used only by one function | Keep the schema in that function's `events/` group. |
| Used by multiple functions in one application | Use an application-owned contracts module outside the private function folders. |
| Shared by producer and consumer applications | Use the project's shared-contract package and its public exports. |

Reuse the established contracts location and package name. Do not duplicate shared schemas inside a
worker or import another application's source. In a non-monorepo, use the established shared-contract
distribution mechanism; no particular `packages/` layout or import alias is mandatory.

## Application-Wide Integrations

- Keep reusable worker modules directly under `src/`: `constants/` for environment configuration and
  application-wide constants; `lib/` for configured database/storage clients, email adapters, and logging;
  and `utils/` for reusable dependency-free helpers when needed. Do not introduce `shared/` or separate
  application-level folders for individual integrations.
- Preserve an established environment-configuration boundary, even at another path, as required by the
  general rules. Do not create a competing configuration module merely to match the default layout.
- Initialize reusable clients outside invocation handlers when their lifecycle supports it. Preserve
  runtime configuration timing and keep invocation-specific state out of reusable clients.
- Keep function-specific logic inside its owning function until another consumer genuinely requires it.
- Keep infrastructure outside business code and preserve the repository's established infrastructure tool.

## Failure Contracts And Verification

- Map failures to the trigger's acknowledgment/retry contract; never acknowledge failed work as success.
  For standard Lambda/SQS partial batch responses, enable `ReportBatchItemFailures` on the event-source
  mapping and return failed message IDs. For FIFO, stop after the first failure and report both failed
  and unprocessed messages to preserve ordering. Other triggers use their own failure contracts.
- Log safe identifiers and failure categories without exposing message bodies, personal data, or secrets.
- Verify that valid messages reach the business operation with parsed values, malformed/invalid messages
  produce no business effects, and processing failures map to the trigger's retry contract. For batches,
  verify successful and failed records are handled according to the queue's ordering guarantees.
- Test business operations independently of Lambda or other trigger runtimes, replacing external effect
  boundaries rather than asserting only internal helper calls.
- Schema validation does not provide idempotency. Use a durable duplicate-delivery strategy for effects
  such as email delivery, accounting for retries after partial success; do not treat an in-memory set
  or a schema-validated job ID as duplicate protection.

See the [send-email example](../assets/worker-send-email.md) for a shared contract, trigger-independent
processor, standard SQS batch adapter, and thin entry point.
