# US-007 Edit Memory UI Prompt

Design and implement the authenticated **Edit Memory** experience for Leonly, a private two-person
space for preserving shared memories. Use the existing create-memory editor and memory-detail screens
as the visual source. This must feel like revisiting a carefully kept page, not opening an admin form.

## Product Intent

Either active member may refine an available memory without changing who originally preserved it or
disturbing its comments and reactions. Editing can update details, photographs, cover, and whether the
memory appears in the Timeline or the shared Private Vault. Vault means hidden from the Timeline, not
hidden from the partner.

## Visual Direction

- Preserve Leonly's warm editorial language: blush paper surfaces, warm white canvas, burgundy primary
  actions, restrained lavender accents, Fraunces headings, Nunito Sans controls/body copy, soft warm
  borders, sparse shadows, and photography as the dominant content.
- Reuse the exact input geometry, wide responsive composition, photo cards, placement controls, focus
  treatment, and motion rhythm from the current Create Memory page.
- Use edit-specific copy and state, but do not introduce a second form design, cold settings panel,
  dense dashboard, stepper, data table, glassmorphism, unrelated gradient, or new font.
- The visual memory should be "the same scrapbook page, opened for careful revision."

## Page Composition

- Use the existing authenticated dashboard shell and preserve its desktop sidebar and mobile bottom
  navigation.
- Provide creation at `/memories/new` and editing at `/memories/:id/edit`; both routes must render the
  same form UI and responsive composition rather than duplicated or merely similar forms.
- Expose the concise localized Edit action only on direct Timeline and Vault detail pages, never on
  memory cards or summary surfaces. Place it in the preserved-by footer: above attribution on mobile,
  and on the same row with attribution left and Edit right when both fit.
- Start editing with a quiet back link to the detail route matching the memory's initial placement, not
  a generic list.
- Add an editorial intro:
  - Eyebrow: `Memory editor`.
  - H1: `Refine this memory`.
  - Supporting copy: explain that changes update the shared memory for both members.
- Keep one shared semantic form composition, initialized empty for creation and with every current
  editable value filled in for editing.
- On desktop, use the existing Create Memory wide layout:
  - Photo workspace on the left.
  - Title, date, location, story, and placement controls on the right.
  - A clear action footer beneath the editor.
- On mobile, preserve logical source order in one column: intro, primary fields, photos, story,
  placement, feedback, actions. Do not hide photo or placement controls.

## Editable Fields

- Reuse the existing labels, required/optional indicators, character counts, past-date picker, and
  validation placement from Create Memory.
- Prefill title, memory date, location, description, and current placement.
- Keep `Our timeline` and `Private vault` as the two radio-card placement choices with the existing
  icons and explanatory copy.
- Make current placement understandable through selected state, text, and icon; never color alone.
- Do not expose creator, creation timestamp, comments, reactions, UUIDs, version tokens, object paths,
  or authorization metadata as editable fields.

## Photo Workspace

- Show the final draft count as `n/5`, combining retained and newly selected photos.
- Render retained authorized photos and new local previews in one coherent photo grid using the current
  photo-card geometry.
- Add restrained text badges such as `Saved photo` and `New photo` so draft provenance is clear without
  changing card hierarchy.
- Every photo provides:
  - Meaningful preview or accessible unavailable fallback.
  - A radio control for cover selection.
  - A real remove button outside the cover control.
- Keep the current cover visibly and semantically selected on initial load.
- Allow every photo to be removed; when none remain, show a calm empty photo workspace and explain that
  the memory will use its no-photo presentation.
- Keep retained photos in their current relative order and append new photos in selection order.
- Do not add drag handles, arrows, sortable behavior, cropping, rotation, or fake reordering affordances.
- Never display or send Storage object paths. Existing previews come only from server-authorized signed
  URLs; new previews use local object URLs.

## Actions And Navigation

- Use one primary burgundy edit action: `Save changes`.
- Use a quiet secondary `Cancel` action that returns to the detail route matching the memory's initial
  placement without saving.
- Keep both actions available at supported widths; do not put the only save control in a hover menu.
- While saving:
  - Disable repeated save and conflicting draft actions.
  - Keep the form visible without pretending the edit already succeeded.
  - Change the primary label to `Saving changes…` and announce pending state.
- After success, navigate to the same memory's detail route for its final placement:
  - Timeline placement -> `/memories/:id`.
  - Vault placement -> `/vault/:id`.
- Use the existing global toast system to announce a concise localized success message and navigate to
  the clean detail URL without persistent success query state. Do not use an inline or full-screen
  success ceremony.

## Required States

- **Initial loading:** an edit-shaped skeleton matching the final two-column/stacked geometry, including
  photo workspace, prefilled fields, placement choices, and action footer.
- **Generic unavailable:** reuse the existing memory not-found language without revealing missing,
  deleted, wrong-space, or inaccessible state.
- **Field/file validation:** show errors beside their controls, retain valid draft values, connect errors
  with `aria-describedby`, and set `aria-invalid`.
- **Recoverable save failure:** keep every entered value, retained-photo choice, and new local file;
  present a concise inline alert and a clear retry path.
- **Concurrent edit conflict:** replace the action feedback area with a prominent but calm panel:
  `This memory changed while you were editing.` Explain that reloading protects the partner's newer
  changes. Primary action: `Reload current memory`. Secondary action: return to detail. Never silently
  overwrite or auto-merge.
- **Expired retained preview:** show an accessible photo fallback without removing that photo from the
  draft or treating it as a failed edit.
- **Placement change:** update the selected placement immediately in the draft, but do not remove the
  current screen or claim success before save commits.

## Responsive Behavior

- Mobile first, with no document-level horizontal overflow and enough bottom padding for the fixed
  mobile navigation plus `env(safe-area-inset-bottom)`.
- At 640 px, allow the photo grid to use available width without shrinking controls below comfortable
  touch targets.
- At `md` and above, preserve the existing sidebar and Create Memory wide editor proportions.
- At large widths, constrain readable text and form controls; photography may use the extra space, not
  body-copy line length.
- Verify mobile, 640 px, 768 px, 1024 px, and a wide desktop viewport.

## Interaction And Accessibility

- Use semantic landmarks, one H1, a real `<form>`, fieldsets/legends for placement and cover, explicit
  labels, real links for navigation, and real buttons for draft mutations.
- Preserve keyboard operation for file selection, cover choice, photo removal, date selection, cancel,
  reload, and save.
- Use the established burgundy 2 px `:focus-visible` outline with offset.
- Announce pending, validation summary, recoverable error, conflict, and success feedback without
  moving focus unpredictably.
- Do not communicate retained/new, cover, placement, pending, or error state through color or icon
  alone.
- Use at most one subtle 160-300 ms staggered entrance sequence. Respect `prefers-reduced-motion` and
  remove nonessential movement when enabled.
- Target WCAG 2.2 AA contrast, names, states, touch targets, and keyboard behavior.

## Engineering Constraints

- Next.js 16, React 19, strict TypeScript, existing Motion, TanStack Query, Lucide, shadcn/Radix
  primitives, CSS modules, and existing Leonly tokens/components only.
- Read `DESIGN.md`, Create Memory, PhotoPicker, Timeline/Vault detail, and their tests before writing UI.
- Extract the existing create form/photo presentation as the exact shared UI consumed by Create and
  Edit; keep their network hooks, initial state, copy, and submission workflows separate.
- Keep route files thin, collocate page-owned components and styles, and keep one production React
  component per `.tsx` file.
- Do not add a dependency, global token, font, generic redirect parameter, manual photo ordering,
  client-trusted owner/space/visibility, or unrelated redesign.
- Preserve private signed-media delivery, generic unavailable outcomes, expected-version conflict
  protection, single-flight submission, and all-or-nothing edit behavior.

The result should feel immediately familiar to anyone who has created a Leonly memory: the same warm,
photographic editor, now calmly prefilled and precise enough to protect a shared story while it changes.
