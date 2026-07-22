# US-010: Add Comment to Memory

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-025, US-028

## User Story

As a space member, I want to comment on a memory so I can add thoughts, context, or emotional notes to a shared moment.

## Intended Outcome

An active member can view and add visible comments, with author and timestamp, to an active memory in their space.

## Business Rules

- Comment text is required after trimming and limited to 1,000 characters.
- The server derives author and space access; users cannot comment on another space's or deleted memory.
- Visible and hidden memories both accept comments from either active member.
- Duplicate submissions are prevented while the request is pending.
- Comments are ordered newest first by creation timestamp and ID, with bounded cursor load-more pagination.

## Acceptance Criteria

- [ ] Valid comments appear after successful submission with author and timestamp.
- [ ] Initial and load-more requests return deterministic pages without duplicate or skipped comments.
- [ ] Empty, whitespace-only, too-long, and cross-space comments are rejected.
- [ ] Deleted-memory comments are rejected.
- [ ] Loading and error states are clear and retryable.

## Verification

- [ ] Test validation, concurrent/double submit, deleted memory, and authorization failures.
