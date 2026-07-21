# US-010: Add Comment to Memory

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-003, US-025

## User Story

As a space member, I want to comment on a memory so I can add thoughts, context, or emotional notes to a shared moment.

## Intended Outcome

An active member can add a visible comment, with author and timestamp, to an active memory in their space.

## Business Rules

- Comment text is required after trimming and limited to 1,000 characters.
- The server derives author and space access; users cannot comment on another space's or deleted memory.
- Duplicate submissions are prevented while the request is pending.

## Acceptance Criteria

- [ ] Valid comments appear after successful submission with author and timestamp.
- [ ] Empty, whitespace-only, too-long, and cross-space comments are rejected.
- [ ] Deleted-memory comments are rejected.
- [ ] Loading and error states are clear and retryable.

## Verification

- [ ] Test validation, concurrent/double submit, deleted memory, and authorization failures.
