# US-010 Memory Comments UI Prompt

Design and implement the **comments section on Leonly memory detail** for both Timeline and shared Private
Vault memories. Leonly is a private space for exactly two active members to preserve shared memories. This
is not a public social feed and not a realtime chat. Extend the existing memory-detail composition and
Leonly visual system; do not invent a second product language.

## Experience Intent

Make comments feel like **small notes written together in the margin of a treasured memory album**. The
section should invite personal context without competing with the memory's photography, title, or story.
It must feel intimate, calm, tactile, and quietly premium.

Use this hierarchy:

1. The memory remains the hero.
2. The composer is the one primary action inside the section.
3. Newest comments are immediately readable below it.
4. Pagination and recovery controls stay quiet but unmistakable.

Avoid chat bubbles, message tails, typing indicators, online presence, social engagement counters,
oversized avatars, public-feed chrome, dense cards, glassmorphism, cold gray panels, bright gradients, or
decorative animation.

## Placement And Anatomy

Render one semantic section in the existing `memory-comments` extension region, after the memory
description/reaction region and before the preserved-by/action footer. Use the same component for Timeline
and Vault memories; do not style Vault comments as more secret from the partner.

Build a single-column **editorial correspondence block**:

- Warm blush or warm-white paper surface using existing Leonly tokens.
- Soft burgundy-tinted 1 px border, `0.8rem` to `1rem` radius, and little or no shadow.
- Comfortable internal rhythm based on 8 px increments; approximately 20 px mobile and 24 px desktop
  padding.
- Section header with a small quiet eyebrow such as `Shared notes`, Fraunces H2 `Comments`, and optional
  active comment count only if the backend provides an exact count. Do not infer a total from loaded pages.
- A short Nunito Sans sentence: `Add a thought, detail, or feeling to this memory.`
- Composer first, then a subtle divider, then newest-first history.
- A thin warm-rose vertical thread or aligned circular initial markers may visually connect comments, but
  keep it restrained and `aria-hidden`; never make decoration necessary to understand order or authorship.

## Composer

Use a real form with a visible label `Add a comment` and a multiline textarea. Do not use placeholder-only
labeling.

- Textarea: full width, minimum 3 rows on mobile and 4 rows where space permits; auto-grow only up to a
  reasonable height before the document continues naturally. Avoid an internal scroll trap where possible.
- Surface: warm off-white fill, low-contrast warm border, `0.8rem` radius, 16 px minimum text, and
  comfortable line-height.
- Focus: established burgundy border plus visible soft focus ring; never remove the browser-visible focus
  treatment without an equivalent.
- Placeholder: `Write what this moment means to you...` as example copy only, not the label.
- Helper row below the textarea: validation/status text on the left and `current / 1,000` character count
  on the right. Let both wrap rather than overlap.
- Count all entered Unicode characters consistently with server validation and show the count at all times.
- At 900 characters, add quiet text such as `100 characters left`; do not rely on amber color alone.
- Over 1,000, show a field-associated message `Comment must be 1,000 characters or fewer.` and the exact
  overage. Do not truncate pasted text.
- Whitespace-only and over-limit drafts keep the primary action disabled.
- Primary button copy: `Add comment`. Use the existing burgundy primary button, not a new CTA color.
- Mobile: button spans the available width and is at least 44 px high.
- Wider layouts: the action may align to the right below the textarea, but the textarea remains full width.
- `Cmd/Ctrl + Enter` may submit only if the app already has a discoverable shortcut pattern; otherwise use
  the button and native form submission. Never make a shortcut the only path.

## Comment Item

Render history as a semantic list. Each comment is a list item, not a separate floating card.

- Use a compact header row with the current membership display name in strong Nunito Sans and a localized
  creation timestamp in subdued but contrast-safe text.
- Use a semantic `<time datetime="...">`. Prefer an unambiguous localized date and time over a relative
  timestamp that can become stale without updates.
- If initials are shown, derive one or two characters from the display name, place them in a small warm-rose
  or lavender seal, and mark the seal decorative because the adjacent name is authoritative.
- Comment body follows below with preserved line breaks, natural wrapping, and normal JSX text rendering.
  Never render comment HTML or Markdown.
- Long words and URLs must wrap without horizontal overflow. Do not clamp or hide a valid 1,000-character
  comment.
- Separate comments with spacing and a soft warm divider rather than individual shadows.
- Do not add reply, edit, delete, reaction, overflow-menu, or share controls in US-010.
- Keep newest comments first. Do not visually imitate an oldest-first chat transcript.

## Complete State Matrix

### 1. Initial Section Loading

- Keep the memory detail visible; comments load as their own region.
- Render the section shell, header skeleton, composer-shaped stable placeholder, divider, and three
  comment-row skeletons with varied text lengths.
- Skeletons use warm neutral surfaces and preserve final geometry. They must not include fake names,
  timestamps, or comments.
- If loading passes the app's established slow-network threshold, add quiet announced copy such as
  `Loading comments...`.

### 2. Loaded With Comments

- Show the active composer followed by the newest-first list.
- Preserve all author names, timestamps, line breaks, and deterministic server order.
- Do not animate every row repeatedly. At most use one subtle 160-240 ms section reveal on first load.

### 3. Empty History

- Keep the composer fully available.
- Below the divider, show a small open-book or message-circle Lucide icon and the heading
  `No comments yet`.
- Supporting copy: `Be the first to add a note to this memory.`
- Do not add a duplicate empty-state CTA; the visible composer is already the action.
- Avoid lonely oversized illustrations or language that implies an error.

### 4. Pristine Composer

- Textarea is empty, count reads `0 / 1,000`, no error is shown, and `Add comment` is disabled.
- Helper copy may explain `Comments are shared with both members of this space.`

### 5. Valid Draft

- Enable `Add comment` as soon as trimmed text is valid and within the limit.
- Keep entered whitespace visible while editing; server normalization occurs on acceptance.
- Do not show a success treatment merely because local validation passes.

### 6. Required Validation

- On blur after interaction or attempted submit with an empty/whitespace-only draft, set
  `aria-invalid="true"`, associate the message through `aria-describedby`, and show `Enter a comment.`
- Include an error icon or explicit `Error:` wording so red is not the only signal.
- Preserve the entered draft and return focus to the textarea only after an attempted invalid submit, not
  on passive validation.

### 7. Near Character Limit

- At 900-1,000 characters, keep submission available and show exact remaining characters in text.
- Use a subtle warning tone only as reinforcement; maintain readable contrast.

### 8. Over Character Limit

- Preserve the complete draft, show the exact count and overage, set the field invalid, and disable submit.
- Message: `Comment must be 1,000 characters or fewer. Remove {count} characters.`
- Never silently truncate or erase content.

### 9. Submission Pending

- Freeze the submitted textarea and action so request content and idempotency key cannot drift.
- Keep the full comment visible; do not clear it yet.
- Change button copy to `Adding comment...`, include a small spinner, and expose native disabled/busy
  semantics.
- Announce progress politely. Do not block scrolling or dim the whole memory detail.
- Ignore double activation and do not render a temporary comment in history before server confirmation.

### 10. Submission Success

- Reconcile the canonical server comment exactly once at the top of the list, even if the idempotent retry
  returns an existing result.
- Transition from empty state to list without a layout jump that moves the whole page unexpectedly.
- Clear the textarea only after the comment is accepted, reset the count to `0 / 1,000`, and disable the
  submit action again.
- Announce `Comment added.` in a polite live region. Do not move focus to the new comment or show a blocking
  dialog.
- A restrained 160-220 ms background tint fade on the accepted row may show arrival; remove it under
  `prefers-reduced-motion`.

### 11. Recoverable Submission Error

- Restore textarea editing and preserve every character of the draft.
- Show an inline alert directly below the composer: `We couldn't add your comment. Your text is still
  here.`
- Add a real secondary `Try again` button and keep `Add comment` available only according to validity.
- Retry the same logical request while content is unchanged. If the member edits the draft, dismiss the
  stale request error and treat the next submit as a new logical submission.
- Do not rely on a toast as the only failure or recovery path.

### 12. Memory Becomes Unavailable During Submit

- Remove stale comment data and transition to the existing generic memory not-found route state.
- Do not say whether the memory was deleted, moved, inactive, or outside the space.
- Do not leave the draft presented as if it can still be submitted to that memory.

### 13. Initial History Error

- Keep the authorized composer visible and usable because creation and history recovery are independent.
- Replace only the list region with a compact inline error: `Comments couldn't be loaded.`
- Provide a real secondary `Try again` button that retries the first page.
- Do not fabricate an empty state and do not replace the whole memory detail with an error.

### 14. Load More Available

- After the currently loaded list, show one centered quiet bordered button: `Load earlier comments`.
- Keep at least a 44 px target and visible focus. Do not use automatic infinite scroll.

### 15. Load More Pending

- Keep every loaded comment visible and stable.
- Disable only the pagination control, change its label to `Loading earlier comments...`, and include a
  small spinner.
- Do not replace the list with skeletons and do not scroll the reader automatically.

### 16. Load More Error

- Keep loaded comments untouched.
- Replace the pagination status with `Earlier comments couldn't be loaded.` plus a `Try again` button that
  retries only the failed page.
- Announce the failure without stealing focus.

### 17. Cursor Reset Or Refreshed History

- Replace accumulated pages with the current first page; never append reset results to stale comments.
- Deduplicate by canonical comment ID.
- Preserve the user's composer draft.
- Announce `Comments were refreshed.` through the polite live region. Do not expose cursor terminology.

### 18. End Of History

- Remove the load-more action when no next cursor exists.
- Optionally show a quiet, noninteractive line `You've reached the first note.` only when several pages were
  loaded; omit it for a single short page to avoid clutter.

### 19. Local Refresh After Success

- Keep the accepted canonical comment visible while the local query refreshes.
- Deduplicate the refreshed result and preserve newest-first order.
- Do not show a blocking loading state or clear the whole list during background refresh.

### 20. Reduced Motion

- Remove row entrance translation, arrival tint animation, and skeleton shimmer when reduced motion is
  requested.
- State changes remain immediate, readable, and announced.

## Responsive Behavior

- Design mobile first for the existing memory-detail story column.
- Under 640 px: one full-width section, stacked helper/count text when needed, full-width submit and retry
  controls, 16 px body text, no horizontal scrolling, and safe spacing above fixed bottom navigation.
- At 640 px and above: preserve a readable single-column list; align helper/count and secondary actions on
  shared rows only when they do not compress copy.
- At 768 px and above: the comments block remains within the shared detail's story column beside the photo
  gallery. Do not stretch it under both columns unless the existing detail composition is intentionally
  changed for all consumers.
- At 1024 px and above: cap text measure around 60-70 characters; comments must not become a wide social
  feed.
- Verify 320/375 px small phones, 640 px, 768 px, and 1024 px. Support browser zoom and text enlargement
  without clipped controls or overlapping metadata.

## Accessibility Contract

- Use a section labeled by an H2, a real form, explicit label, textarea, semantic list, `<time>`, and real
  buttons.
- Keep DOM/source order: heading, description, composer, composer feedback, history status, list,
  pagination.
- Associate helper and error text with the textarea. Use `aria-invalid` only when invalid.
- Use one polite live region for progress/success/refresh and an assertive or alert treatment for actionable
  failures; avoid duplicate screen-reader announcements.
- Preserve visible burgundy `:focus-visible` states and logical tab order.
- Every pointer target is at least 44 by 44 CSS pixels with 8 px separation where actions are adjacent.
- Never communicate pending, error, success, Vault status, or pagination availability through color alone.
- Maintain WCAG 2.2 AA contrast in all text, borders, icons, disabled states, and focus indicators.
- Do not move focus on successful async updates. On invalid submit, focus the textarea. After retry failure,
  leave focus on the activated retry control unless the memory becomes unavailable.

## Visual Tokens And Motion

- Fraunces for the section heading only; Nunito Sans for labels, body, metadata, buttons, and feedback.
- Reuse warm canvas, blush paper, burgundy action, rose highlight, lavender accent, warm border, destructive,
  and focus tokens from `DESIGN.md` and `globals.css`; do not hardcode a parallel palette.
- Use Lucide icons only, with one consistent light-to-medium stroke. No emoji as structural icons.
- Use `0.8rem` input radius, `0.65rem` to `1rem` section radius, sparse warm depth, and no glass effects.
- Motion lasts 160-240 ms, uses opacity/transform only, communicates accepted or revealed state, and never
  blocks input.

## Engineering Constraints

- Next.js 16, React 19, strict TypeScript, existing TanStack Query, Zod, i18n, Motion, Lucide,
  shadcn/Radix primitives, CSS Modules, and Leonly components only.
- Read `DESIGN.md`, the current `MemoryDetailView`, and its co-located styles before implementation.
- Populate the existing `comments` extension region in both Timeline and Vault wrappers with one reusable
  feature-owned composition.
- Keep route files thin, server-only authorization out of client bundles, one production React component
  per `.tsx` file, and files under 400 physical lines.
- Render untrusted comment text through normal React interpolation; never use `dangerouslySetInnerHTML`.
- Do not add a dependency, font, global token, realtime transport, or unrelated memory-detail redesign.

The finished section should feel like opening a shared album and finding a few thoughtful notes tucked
beside the photograph: personal and alive, but still calm enough for the memory itself to remain central.
