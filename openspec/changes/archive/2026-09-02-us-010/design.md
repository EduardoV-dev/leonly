## Context

See `proposal.md` for motivation and `specs/memory-comments/spec.md` for observable behavior. Timeline
and Vault already use one `MemoryDetailView`, which exposes an optional `comments` region inside the
story column. Both detail routes authorize available memories through the same active-space boundary.
The app also has established keyset pagination, TanStack Query invalidation, Zod validation, generic
not-found behavior, and server-controlled idempotency patterns for memory mutations.

US-010 adds the first persisted child conversation resource. It crosses database authorization, soft
deletion, keyset pagination, idempotent mutation, server/client composition, asynchronous accessibility,
and two memory placements without introducing realtime synchronization.

## Goals / Non-Goals

**Goals:**

- Use one comments capability and one UI composition for Timeline and Vault memory details.
- Keep comment reads and writes inside the same non-enumerating active-space boundary as memory detail.
- Make pagination deterministic and retry-safe under deletion and stale cursors.
- Prevent duplicate comments after double activation, timeout, or retry.
- Keep composer and history failures independent so one recoverable problem does not unnecessarily block
  the other.
- Make every UI state explicit and testable before implementation.

**Non-Goals:**

- Realtime partner updates, polling, unread badges, notifications, or presence.
- Editing, deleting, reacting to, replying to, mentioning, pinning, or moderating comments.
- Rich text, Markdown, links with special rendering, attachments, emoji pickers, or author-controlled
  timestamps.
- Comment counts outside the detail section.
- Infinite-scroll observers, virtualization, or optimistic pre-server insertion.

## Decisions

### Store comments as active-space children with server-derived identity

Add a `memory_comments` table containing a generated UUID, memory ID, copied space ID, authenticated
author user ID, normalized plain-text body, server creation timestamp, nullable deletion timestamp,
idempotency key, and request fingerprint. Use database constraints for nonblank trimmed text and the
1,000-character maximum in addition to boundary validation.

The mutation boundary derives the active membership and memory's space, then inserts all authority fields
server-side. A composite relationship or transactional validation keeps copied `space_id` consistent with
the parent memory. RLS permits reads only through an active membership and available parent memory; direct
client inserts are not trusted. Author display names are resolved from the memory-space membership at
read time so existing comments follow current membership naming.

Keeping `space_id` on the child makes tenant filters and policies explicit and indexable. It is derived
data, so the server and database must own it rather than the browser.

Alternatives considered:

- Trusting a submitted space or author ID creates a cross-space impersonation boundary.
- Storing only a display-name snapshot contradicts the story's current-name requirement.
- Global comment reads followed by application filtering risk data exposure and inefficient policies.

### Use a unique mutation key on the comment row

Enforce uniqueness on `(author_user_id, idempotency_key)` and store a fingerprint of the normalized
memory ID and body. One server-controlled transaction creates the comment or returns the existing row
when key and fingerprint match. A mismatch returns a validation conflict. This provides durable retry
safety without a separate attempt table because comment creation has one database commit and no external
Storage side effect.

The browser generates one UUID when a valid logical submission begins. The text and key remain frozen
while pending. A recoverable retry reuses both. Editing the draft after failure starts a new logical
submission and therefore receives a new key.

Alternatives considered:

- Local button disabling alone cannot prevent duplication after a timeout or browser retry.
- A separate attempt table adds lifecycle and cleanup state without protecting any cross-system work.
- Content deduplication would incorrectly prevent intentional repeated comments.

### Use 20-item full-tuple keyset pagination

Return at most 20 active comments ordered by `created_at DESC, id DESC`. The strict Base64URL JSON v1
cursor contains `{ createdAt, id, memoryId, v }`; including the memory ID prevents accidental cursor reuse
across details. The next query applies the lexicographic predicate after the complete tuple and fetches
21 rows to determine whether another page exists. A partial index on active comments by
`(memory_id, created_at DESC, id DESC)` supports the path.

Before using a cursor, validate its shape, version, memory match, and active anchor membership. A malformed,
cross-memory, deleted-anchor, or otherwise stale cursor returns the current first page with
`cursorReset: true`. The client replaces all accumulated pages and announces a refresh. New comments do
not invalidate an otherwise available anchor; the next successful local action refreshes the first page.

Alternatives considered:

- Offset pagination can duplicate or skip rows when comments are inserted or soft-deleted.
- Timestamp-only cursors are ambiguous when timestamps tie.
- Treating invalid cursors as fatal turns a recoverable navigation state into a dead end.
- Automatic infinite scroll hides pagination status and complicates keyboard recovery for a small
  two-person conversation.

### Split authorized mutation from independently recoverable history

Memory detail routes continue to authorize and resolve the parent. The reusable comments feature receives
only the authorized memory ID; the server revalidates authority for each read and mutation. The first
comment page may be supplied as route data or hydrated query data, while subsequent pages use one
memory-scoped infinite query key.

The composer and history render inside the same semantic section but hold independent request states. A
history read failure leaves the authorized composer available. A load-more failure preserves prior pages.
A successful mutation returns the canonical comment, prepends or reconciles it by ID exactly once, clears
the draft, and invalidates the memory-comment query so the local history refreshes from page one. This is
post-confirmation reconciliation, not optimistic creation.

If mutation revalidation says the memory is unavailable, route-level navigation or refresh enters the
existing generic memory not-found experience and removes stale comments. Other failures remain local and
retryable.

Alternatives considered:

- Making comments part of the base detail read couples a recoverable child failure to the entire memory
  story and makes the composer unusable unnecessarily.
- Blind optimistic comments require temporary identities and rollback semantics not needed for MVP.
- Full route refresh loses local context and is heavier than query reconciliation.

### Render an editorial correspondence block in the existing extension region

Populate the existing `comments` slot in both detail page wrappers with one feature-owned
`MemoryComments` composition. Keep it after memory narrative content and before the preserved-by footer so
comments read as marginal notes attached to the story, not a social feed. The section uses a warm blush
paper surface, a Fraunces heading, compact Nunito Sans metadata, a restrained vertical thread, and
border-separated notes without speech bubbles, chat chrome, or avatar-heavy social styling.

The form appears before history because adding context is the primary local action. On mobile, the textarea
and full-width submit action stack. At wider story-column widths, metadata and controls may share rows but
the textarea remains full width. The list remains one column at every breakpoint; long text wraps and
preserves line breaks.

The complete reusable design brief and state matrix are in `ui-prompt.md`.

Alternatives considered:

- A chat transcript implies realtime delivery and chronological oldest-first conversation.
- Speech bubbles and reaction-like color coding compete with the memory photography and feel generic.
- Moving comments below related memories disconnects conversation from the memory narrative.
- A modal or drawer hides history and introduces unnecessary focus management.

### Validate on blur and submit while keeping draft recovery explicit

The textarea has a persistent label and supporting copy, permits enough input to expose over-limit
feedback, and displays `current / 1,000`. Whitespace-only and over-limit drafts disable submit. Validation
appears on blur or attempted submit rather than as an error on the first keystroke. Approaching and
exceeding the limit uses text and iconography in addition to color.

During submission, freeze the textarea and submit control, keep the visible text, and change the button
label to `Adding comment...` with a spinner. On success, clear the field only after the canonical comment
is reconciled and announce `Comment added.` through a polite live region without moving focus. On
recoverable failure, restore editing, retain the draft, show a concise inline alert, and expose `Try again`
using the same logical request while content is unchanged.

Alternatives considered:

- Clearing at request start risks losing meaningful writing.
- Character truncation hides why pasted content changed and prevents deliberate correction.
- Toast-only failure is detached from the affected draft and can disappear before recovery.

## Risks / Trade-offs

- [Current display-name joins can fail if membership lifecycle data becomes inconsistent] -> Keep comment
  authority attached to the parent space, resolve names in the authorized query, and fail safely without
  exposing raw user identifiers.
- [Cursor reset can move the reader back to newest comments after deletion] -> Announce the refresh and
  prefer a coherent current list over silently skipping or duplicating records.
- [A successful mutation response can race its invalidation refetch] -> Reconcile by canonical comment ID
  and deduplicate flattened pages before rendering.
- [Copied `space_id` can drift from the parent] -> Set it only inside the mutation transaction and enforce
  parent consistency in the database contract.
- [No realtime means a partner's comment may not appear immediately] -> Keep this limitation explicit;
  local actions refresh, and a normal route revisit retrieves current history.
- [A 1,000-character comment can make the narrow detail column tall] -> Preserve wrapping and whitespace,
  avoid nested scrolling, and paginate by item count rather than clipping text.

## Migration Plan

1. Add comment persistence, constraints, active-history index, RLS, grants, and the server-controlled
   idempotent create transaction without exposing UI.
2. Add server validation, authorized comment page/create boundaries, cursor codec, and database-focused
   tests for access, text limits, soft deletion, ordering, cursor reset, and idempotency.
3. Add the reusable comments query/composer composition, localized copy, styles, state tests, and populate
   both detail wrappers through the existing extension region.
4. Verify Timeline and Vault details, generic unavailable outcomes, keyboard behavior, announcements,
   responsive layouts, reduced motion, and retry paths before release.
5. Roll back by removing the comments composition and server entry points first. Preserve comment rows
   during rollback so accepted shared context is not destroyed; remove schema only through a separately
   reviewed data-retention decision.
