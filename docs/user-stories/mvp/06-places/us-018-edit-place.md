# US-018: Edit Place

**Priority:** Must<br>
**Depends on:** US-015, US-025

## User Story

As an active member, I want to edit a place in my active space so I can correct or improve its shared details.

## Intended Outcome

Either active member can edit an active place's name, category, description, location, cover, and budget. The form starts from the latest readable values and does not modify ratings or creator ownership.

## Scope

- Prefilled editable place fields, cover retention or replacement, save, and cancel.
- Validation, pending, success, recoverable failure, and refreshed list and detail presentation.

## Inputs and Validation

- Name, category, description, location, budget, and cover use the same limits, normalization, enum, currency, and file validation decided for US-015.
- Name and category remain required after an edit.
- A budget update supplies or clears the amount and original currency as one logical value.
- A replacement cover must be one JPEG, PNG, or WebP image of at most 5 MB and pass server-side content verification.
- Client-supplied space, creator, or rating values are ignored or rejected.

## Business Rules

- The server authorizes the target place from the authenticated active membership; either active member has equal edit access.
- Missing, inactive, soft-deleted, and inaccessible place IDs produce the same generic not-found result.
- Existing readable values are prefilled; canceling before submission makes no change.
- A replacement cover is uploaded privately to the active space. It becomes current only if the place update succeeds.
- After a successful replacement, the old cover is retained but becomes inaccessible through product and storage routes. A failed update cleans up the new object and keeps the old cover current.
- A successful update appears in list and detail views after the MVP refresh behavior; realtime partner updates are not required.

## Decision Required

- Decide whether a cover can be removed without replacement and define the resulting fallback and retained-object state.
- Define stale-edit and concurrent-update behavior, including whether updates require a version or last-updated precondition.
- Define whether the form submits a full replacement or a partial field patch, including omitted-versus-cleared optional values.
- Define the destination and success feedback after save and the destination after cancellation.

## Acceptance Criteria

- Either active member can submit valid changes to an active place in their active space.
- Invalid text, category, budget, currency, and cover input is rejected server-side without changing confirmed data.
- Canceling makes no mutation, and a failed mutation leaves the last confirmed place and cover readable.
- A successful cover replacement exposes only the new cover through product and storage routes.
- Payload tampering cannot change space, creator, ratings, or another space's place.
- Missing, inactive, soft-deleted, and cross-space place IDs return the same generic not-found result.

## Verification Notes

- Verify unchanged, changed, cleared, invalid, canceled, and failed submissions for every editable field.
- Verify cover replacement and cleanup, payload tampering, stale forms, concurrent edits, inactive-space, soft-deleted, and cross-space cases.
