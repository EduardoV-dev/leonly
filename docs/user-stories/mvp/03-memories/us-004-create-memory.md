# US-004: Create Memory

**Priority:** Must


**Depends on:** US-003

## User Story

As an active member, I want to create a memory with photos and details so we can save a meaningful moment in our active space.

## Intended Outcome

An active member can create one visible timeline memory or one hidden memory in the shared Private Vault. The created memory belongs to the member's active space, records that member as creator, uses the selected cover photo, and appears in the appropriate list only after the memory and all selected photos have been saved successfully.

## Scope

- Required title of 1 to 120 characters after trimming and a date-only memory date.
- Optional description of up to 2,000 characters, location of up to 150 characters, and up to 10 photos.
- JPEG, PNG, and WebP photos of at most 5 MB each, with one selected cover when photos are present.
- Visible timeline or shared Private Vault placement.
- Client and server validation, single-flight submission, progress, success, and recoverable failure feedback.

## Business Rules

- The authenticated active membership determines the active space and creator; submitted identity or space values cannot override them.
- A memory date cannot be later than the active member's browser-local calendar date.
- The request includes the browser's IANA timezone. The server validates the timezone and recomputes its local date instead of trusting a submitted current date.
- The server trims and validates text fields and verifies image content rather than trusting a filename extension or client MIME type.
- Visible placement adds the memory to the timeline; hidden placement makes it queryable by the shared
  Private Vault delivered in US-006. Both active members retain authorization for later detail,
  comment, and reaction features.
- Creation succeeds only when the memory and every selected photo are saved. A partial upload or persistence failure leaves no created memory and removes newly uploaded objects.
- While submission is pending, repeated activation does not start another submission or create a duplicate memory.
- Validation errors identify affected fields and retain valid input. A recoverable submission failure retains the form state so the member can retry.

## Acceptance Criteria

- An active member can create a memory with a valid title and date, with or without optional details and photos.
- Whitespace-only or out-of-range text, invalid or future dates, invalid timezones, excess files, oversized files, and unsupported or misidentified image content are rejected without creating a memory.
- The created memory belongs only to the active space and identifies the submitting active member as creator.
- Visible memories appear in the timeline; hidden memories are excluded from it and are available to
  the US-006 Vault query for both active members.
- When photos are present, the selected cover is persisted for timeline and later Vault, detail, and
  dashboard consumers.
- Repeated activation while a request is pending creates at most one memory.
- Upload or persistence failure leaves no partial memory or accessible new photo and presents a retryable error without discarding valid input.

## Decisions

- Successful visible and hidden creation returns the member to the timeline.
- Non-cover photos preserve browser selection order; creation does not offer photo reordering.
- The client retains a UUID idempotency key for unchanged retries so a lost response cannot create a
  duplicate memory.

## Verification Notes

- Verify field, browser-local date, timezone, file count, file size, and verified-content validation at the server boundary.
- Verify active-space and creator derivation against altered payload values.
- Verify visible and shared Private Vault placement, selected cover behavior, no-photo creation, and both members' access.
- Verify repeated activation, lost-response retry behavior once decided, upload failure, persistence failure, cleanup, and recoverable form state.
