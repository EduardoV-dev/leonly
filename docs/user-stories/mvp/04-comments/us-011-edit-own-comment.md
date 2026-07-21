# US-011: Edit Own Comment

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-010, US-025

## User Story

As a comment author, I want to edit my own comment so I can correct or improve what I wrote.

## Intended Outcome

Only the comment's author can edit its active text on an active memory in their current space.

## Business Rules

- Reuse comment trim and 1,000-character validation.
- The edit control is visible only to the author, but the server and RLS must enforce ownership.
- Deleted comments and comments on deleted memories cannot be edited.

## Acceptance Criteria

- [ ] Authors can edit, save, and cancel their comments.
- [ ] Partner comments have no edit action and reject forged update requests.
- [ ] Empty and too-long edits are rejected.
- [ ] The updated text is shown after success; failures preserve the prior comment.

## Verification

- [ ] Test author, non-author, cross-space, deleted-comment, and validation paths.
