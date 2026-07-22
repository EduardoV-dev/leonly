# US-015: Add Place

**Priority:** Must<br>
**Depends on:** US-014, US-025

## User Story

As an active member, I want to add a place to my active space so we can save, rate, and remember a location that matters to us.

## Intended Outcome

An active member can create one place with required identifying details and optional description, location, cover photo, budget, and initial rating. The server derives the target active space and creator from the authenticated membership.

## Scope

- Place details, optional cover upload, optional budget, and optional initial rating.
- Validation, pending, success, recoverable failure, and cancellation behavior.

## Inputs and Validation

- Required: name and category.
- Category must be `restaurant`, `hotel`, `cafe`, `park`, `travel`, or `other`.
- Optional: description, location, one cover photo, budget, and initial rating.
- A budget consists of a non-negative amount and an original currency of `USD` or `NIO`; neither value is accepted alone.
- An initial rating must be a whole number from 1 through 5.
- A cover must be JPEG, PNG, or WebP, at most 5 MB, and pass server-side content verification.
- Client-supplied space, creator, or rating-owner identifiers are ignored or rejected.

## Business Rules

- Only an authenticated active member of an active space can create a place.
- The cover is stored privately for the derived active space and is readable only while both its place and space are active.
- A successful initial rating creates the creator's single member-owned rating for the new place.
- Submission is single-flight in the UI. Failed validation preserves recoverable input and creates no place, rating, or retained new media.
- If media upload or the database mutation fails, newly uploaded objects are cleaned up and the failure is reported without claiming success.
- A successful creation appears after the MVP refresh behavior; realtime partner updates are not required.

## Decision Required

- Set name, description, and location length limits and define trimming, whitespace normalization, and empty-optional-field behavior.
- Set budget maximum, storage precision, accepted decimal scale, and rejection or normalization behavior for excess precision.
- Decide whether place creation and the optional initial rating must commit atomically.
- Define server-side retry or idempotency behavior for duplicate create requests beyond the UI single-flight guard.
- Define the destination and success feedback after creation and the destination after cancellation.

## Acceptance Criteria

- Valid input creates one active place associated only with the derived active space and creator.
- Missing or invalid required fields, budget pairs, ratings, and uploads are rejected server-side with field-specific feedback.
- A valid optional rating creates exactly one rating owned by the authenticated member.
- Payload tampering cannot select another space, creator, or rating owner.
- Upload, database, and duplicate-submission failures do not leave an unintended place, rating, or accessible orphaned cover.

## Verification Notes

- Verify each category, boundary values, omitted optionals, whitespace-only required text, and invalid budget pairs.
- Verify rating ownership, payload tampering, double submission, request retry, upload failure, database failure, and media cleanup.
