## Context

The current memory lifecycle provides UUID-based memory and photo metadata, active-space RLS, a private
`memory-photos` bucket, and server-only signed cover delivery. It intentionally does not define writes or
binary uploads. US-004 adds a multipart mutation across browser, Next.js, Supabase Storage, and Postgres,
where Storage cannot share a transaction with database persistence.

## Goals / Non-Goals

**Goals:**
- Keep all creation authority derived from the authenticated available membership.
- Verify image bytes on the server and keep storage paths and privileged credentials server-only.
- Provide one logical result for retries after an uncertain response.
- Ensure incomplete media is unreadable and cleaned up after recoverable or interrupted failures.

**Non-Goals:**
- Photo reordering, editing, deletion, Vault browsing, realtime synchronization, and image transformation.
- A general-purpose upload framework or client-side direct-to-Storage upload API.

## Decisions

### Use one multipart creation endpoint with an idempotency key

The browser generates a UUID when the form first becomes submittable and sends it with `FormData`; it keeps
that key for a retry until the form is materially changed or succeeds. A server route validates the request,
derives the actor and space, and returns the created memory identifier. The UI uses an upload-capable browser
request boundary to report progress and stays single-flight while it is pending.

An authenticated `memory_creation_attempts` record has a unique creator-plus-key constraint, a normalized
request fingerprint, state, and optional completed memory ID. A duplicate attempt returns the completed
memory or an in-progress retry result; a fingerprint mismatch is rejected. This is preferred to relying on
the client single-flight guard, which cannot handle response loss or concurrent requests.

### Stage objects before final metadata persistence

After validation, the server reserves the idempotency attempt and durable staged-object rows before each
upload. The object path is deterministic from server-derived space, attempt, and photo identifiers, but is
never returned to the browser. Storage read policies continue to require available parent metadata, so an
object without finalized `memory_photos` metadata is unreadable.

When every upload succeeds, a security-reviewed RPC atomically inserts the memory and ordered photo rows,
sets the selected cover, finalizes the attempt, and makes the records available. On a recoverable error, the
route deletes uploaded objects and marks staging rows for cleanup. A server-side cleanup job retries stale
or failed staging rows so a request interruption cannot leave accessible media. This is preferred to
persisting the memory first because a storage failure would otherwise create a visible partial record.

### Keep validation at both UX and trust boundaries

The client validates form affordances and file count/size for immediate feedback. The server independently
normalizes text, validates the IANA timezone and local date, enforces limits, and determines image format
from bytes before any upload. Client MIME types, filenames, space IDs, creator IDs, and current-date claims
are untrusted.

### Preserve selection order and return to the timeline

The form stores files in browser selection order, assigns immutable per-request positions, and exposes only
cover selection. It does not introduce reordering. On successful timeline or Vault creation, the UI returns
to the timeline, which is the established memories browsing surface.

## Risks / Trade-offs

- [Storage and Postgres lack a shared transaction] -> durable staging records, compensation deletes, and a
  retried stale-upload cleanup job prevent incomplete media from becoming available or remaining indefinitely.
- [Idempotency key is reused with altered input] -> store a normalized request fingerprint and reject a
  mismatch rather than silently binding distinct creations.
- [Image-byte verification increases request work] -> enforce the 10-file and 5 MB limits before parsing,
  then inspect only accepted bounded streams.
- [Vault memories are absent from the success destination] -> return to the established timeline while
  preserving Vault exclusion from timeline queries until Vault browsing is delivered in US-006.

## Migration Plan

1. Add creation-attempt and staged-object lifecycle storage with RLS, constraints, retention metadata, and
   security-reviewed finalize/cleanup RPCs.
2. Extend private Storage policies so only the server-controlled authenticated workflow can write or remove
   tracked staged objects; preserve existing read rules.
3. Deploy the route and form after the migration, then enable periodic stale-stage cleanup.
4. Roll back by disabling the creation entry point and route. Existing completed memories retain their
   current lifecycle contract; cleanup remains enabled for any already staged objects.
