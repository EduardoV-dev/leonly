## Why

US-003 can display eligible memories but members cannot create any. US-004 lets an active
member persist a complete shared memory with validated details and private photos without making
partial uploads or client-supplied identity authoritative.

## What Changes

- Add active-space memory creation for timeline and shared Private Vault placement.
- Validate trimmed text, date-only values in the submitted IANA timezone, photo count and size, and
  verified JPEG, PNG, or WebP content at the server boundary.
- Persist ordered photo metadata and the selected cover only after all selected private objects are
  available; remove newly uploaded objects and leave no available memory after recoverable failure.
- Use a client-generated UUID idempotency key per form attempt so a retry after a lost response
  returns the originally created memory instead of creating a duplicate.
- Add a responsive creation form with single-flight submission, upload progress, field feedback,
  recoverable failure feedback, and success navigation back to the timeline.

## Capabilities

### New Capabilities
- `memory-creation`: Validated, idempotent active-space creation of a timeline or Vault memory with
  optional ordered private photos.

### Modified Capabilities
- `memory-lifecycle`: Extend private photo-object authorization with a server-controlled staged
  upload and cleanup lifecycle that never exposes incomplete memory media to members.

## Impact

- Adds an authenticated memory-creation route or Server Action, creation form, validation, upload
  orchestration, and focused route, server, and UI tests in `apps/web-app`.
- Adds a Supabase migration for idempotency and server-controlled staged-media lifecycle support,
  including RLS/RPC authorization and cleanup behavior.
- Integrates with the existing private `memory-photos` bucket, active-space resolution, memory
  lifecycle schema, and timeline refresh contract without exposing storage paths or service-role
  credentials to the browser.
