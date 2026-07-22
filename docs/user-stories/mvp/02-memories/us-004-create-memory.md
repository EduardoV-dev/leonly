# US-004: Create Memory

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-003, US-025

## User Story

As a space member, I want to create a memory with photos and details so we can save meaningful moments in our shared space.

## Intended Outcome

An active member can create a visible timeline memory or a hidden Vault memory without duplicate submissions or unsafe uploads.

## Inputs and Limits

- Required: title (1-120 characters after trimming) and memory date.
- Optional: description (up to 2,000 characters), location (up to 150 characters), and photos.
- Up to five images; each at most 5 MB; JPEG, PNG, or WebP only.
- When photos are present, the member selects one as the cover photo.
- Memory dates cannot be in the future.
- The request includes the browser's IANA timezone; the server validates it and derives the member's local calendar date for future-date validation.

## Business Rules

- The server derives `space_id` and creator from authenticated active membership.
- Timeline visibility maps to `is_hidden = false`; Vault visibility maps to `is_hidden = true`.
- Storage and database failure handling must not leave silently orphaned data.
- The server verifies image content rather than trusting extension or client MIME type.

## Acceptance Criteria

- [ ] Active members can create a memory with title and date, with or without photos.
- [ ] Invalid fields, file types, sizes, counts, and future dates are rejected server-side.
- [ ] The memory is linked to the active space and creator only.
- [ ] The selected visibility determines the appropriate list.
- [ ] The selected cover is used in timeline, Vault, and dashboard previews.
- [ ] Submit is single-flight and shows loading, success, and recoverable error states.

## Verification

- [ ] Test validation, payload tampering, duplicate submit, and upload/database partial failure.
