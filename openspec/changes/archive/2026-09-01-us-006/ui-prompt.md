# US-006 Private Vault UI Prompt

Design and implement the authenticated **Private Vault** screen for Leonly, a private two-person space
for preserving shared memories. Extend the existing product design; do not invent a new visual system.

## Product Intent

The Vault is a **shared archive for both active members**, not a personal secret area and not a security
boundary between partners. It contains memories hidden from the timeline while keeping them fully
available to both people. The interface must say this clearly.

## Visual Direction

- Mood: intimate, tactile, archival, calm, and quietly premium.
- Preserve Leonly's warm editorial system: blush paper-like surfaces, warm white canvas, burgundy
  primary actions, restrained lavender accents, Fraunces headings, Nunito Sans UI/body copy, soft
  warm borders, sparse shadows, and framed photography.
- Use a lock or archive motif as gentle context, never as a warning or surveillance metaphor.
- Make memory photography the dominant content. Avoid a cold SaaS dashboard, dense table, generic
  card grid, black security-console styling, glassmorphism, unrelated gradients, or new fonts.

## Required Composition

- Use the existing authenticated dashboard shell.
- Enable **Vault** in desktop sidebar and mobile bottom navigation and expose it as the current page.
- Add a compact editorial hero with:
  - `Private Vault` as the H1.
  - A short explanation that memories here are shared with both active members but hidden from the
    timeline.
  - A quiet lock/archive visual treatment that does not overpower the content.
- Render eligible Vault memories newest memory date first, grouped or rhythmically separated in a way
  consistent with the existing timeline chronology.
- Each memory card shows the cover photo or accessible fallback, title, date, optional description,
  optional location, and one accessible link to memory detail.
- Preserve independent card regions for future counts and edit/restore/delete actions, but do not
  render fake, disabled, or nonfunctional action controls in US-006.
- Add a restrained `Load Earlier Memories` control after the current 20-item page when more results
  exist.

## Required States

- Initial route loading with a Vault-shaped skeleton that preserves final geometry.
- Slow-network feedback after the established 750 ms threshold.
- Empty state explaining that the shared Vault has no memories yet, with a valid link to create a new
  memory. Do not imply that content is private from the partner.
- Initial read error with an accessible retry action and no fabricated cards.
- Load-more error that keeps loaded cards visible and retries only the failed page.
- Missing cover and optional metadata fallbacks.
- Cursor-reset refresh that replaces stale accumulated results without duplicate cards.

## Responsive Behavior

- Mobile first: compact header, one readable content column, cards that never cause document overflow,
  and bottom navigation respecting `env(safe-area-inset-bottom)`.
- At `md` and above: preserve the permanent/collapsible sidebar and use a spacious editorial content
  column; avoid stretching text or cards excessively on wide screens.
- Verify at mobile, 640 px, 768 px, and 1024 px widths. Essential content and recovery actions must
  remain available at every size.

## Interaction And Accessibility

- Use semantic landmarks and heading order, real links for navigation, and real buttons for retries
  and pagination.
- Keep card actions outside the card's detail link to prevent nested interactive elements.
- Provide visible burgundy `:focus-visible` treatment, meaningful image alternatives, semantic current
  navigation state, and feedback announced to assistive technology.
- Never communicate Vault state through color or icon alone.
- Use one subtle 160-300 ms staggered reveal sequence at most; respect `prefers-reduced-motion` and
  remove nonessential movement when enabled.
- Target WCAG 2.2 AA contrast and keyboard operation.

## Engineering Constraints

- Next.js 16, React 19, strict TypeScript, existing Motion, TanStack Query, Lucide, shadcn/Radix
  primitives, CSS modules, and existing Leonly tokens/components only.
- Read `DESIGN.md` and the existing timeline/dashboard implementation before writing UI.
- Keep route files thin, collocate page-only components and styles, and keep one production React
  component per `.tsx` file.
- Do not add a dependency, global token, font, generic visibility selector, or unrelated redesign.
- Use the server-provided signed cover URL only; never construct or expose Storage object paths.
- Preserve the established active-space authorization, generic not-found behavior, and fixed Vault
  eligibility contract.

The result should feel like opening a carefully kept shared memory box: emotionally warm and visually
distinct from the timeline, while unmistakably belonging to the same Leonly product.
