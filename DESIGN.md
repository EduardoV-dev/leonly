# Leonly Design Guide

Read this before creating or changing a frontend screen. Leonly is a private, elegant sanctuary for shared memories: warm, intimate, editorial, and calm. New UI must extend this system, not introduce a generic dashboard or a second visual language.

## Design Direction

- **Mood:** Personal, tactile, sentimental, and quietly premium.
- **Composition:** Spacious editorial layouts, soft cards, framed photography, and deliberate hierarchy.
- **Avoid:** Cold SaaS dashboards, dense data tables, hard black/white contrast, glassmorphism, gradients unrelated to the existing blush palette, generic Inter-style UI, and decorative motion without purpose.
- **Primary visual memory:** Blush paper-like surfaces, burgundy actions, Fraunces headlines, Nunito Sans UI copy, and meaningful imagery.

## Existing UI Kit

The app uses Tailwind CSS with shadcn/Radix primitives and a custom Leonly visual layer. It does not use a stock shadcn theme as its product language.

| Use | Source |
| --- | --- |
| Global tokens, fonts, and utility classes | `apps/web-app/src/styles/globals.css` |
| Tailwind semantic tokens | `apps/web-app/tailwind.config.ts` |
| Primary full-width form button | `apps/web-app/src/components/ui/button/index.tsx` |
| Low-level/compound primitive button | `apps/web-app/src/components/ui/shadcn-button.tsx` |
| Form composition and errors | `apps/web-app/src/components/ui/field.tsx` |
| Calendar and popover primitives | `apps/web-app/src/components/ui/calendar.tsx`, `popover.tsx` |
| Logo | `apps/web-app/src/components/leonly-logo/index.tsx` |
| Responsive dashboard reference | `apps/web-app/src/features/dashboard/pages/dashboard-page/` |
| Setup-flow reference | `apps/web-app/src/features/space-setup/` |

Use existing primitives and tokens before adding a component or a color. Extend a component only when a new interaction is reused or genuinely cannot be expressed with its current API.

## Foundations

### Typography

| Role | Font | Use |
| --- | --- | --- |
| Display | `Fraunces`, Georgia, serif | Page titles, card titles, milestone figures, brand, and emotionally important copy |
| UI and body | `Nunito Sans`, Segoe UI, sans-serif | Controls, labels, metadata, form text, descriptions, and navigation |

- Use Fraunces with medium/semibold weight, tight tracking, and compact line-height for headings.
- Use Nunito Sans at 600-800 for controls and labels; body copy is readable, never hairline.
- Labels and metadata may be small uppercase with tracking when they clarify hierarchy, not as decoration.
- Do not introduce another font family.

### Color

Use semantic variables where available. The current Leonly palette is intentionally warm and muted.

| Intent | Token or established color |
| --- | --- |
| App canvas | `#fffdfc`, `--auth-surface` (`#f5efee`) |
| Dark atmospheric auth canvas | `--auth-canvas-start`, `--auth-canvas-end` |
| Primary burgundy action | `--auth-button-bg` (`#8a6467`) |
| Brand and warm accents | `--auth-brand` (`#7f5a5f`) |
| Primary heading | `--auth-heading` (`#252323`) |
| Supporting copy | `--auth-copy` (`#635b59`) |
| Muted legal/metadata copy | `--auth-legal` (`#8f8280`) |
| Warm rose highlight | `#f6c4c5`, `#fff4f3` |
| Soft lavender navigation/place accent | `#e9d9ee`, `#eadbf2` |
| Destructive state | `--destructive` and established red tones only |

- Prefer a warm white or blush surface over pure gray.
- Use burgundy for the single primary action in a view. Do not create competing saturated CTA colors.
- Use lavender as a quiet categorization/selection accent, never as the primary brand color.
- Ensure text and interactive controls meet contrast requirements; subdued color is not an excuse for unreadable UI.

### Shape, Surface, and Depth

- Inputs: `0.8rem` radius, warm off-white fill, subtle burgundy-tinted border.
- Cards: `0.65rem` to `1rem` radius. Use white or warm blush surfaces.
- Main auth/setup shells: `1.45rem` mobile and `1.75rem` desktop radius.
- Pills and icon badges: fully rounded only for compact statuses, ratings, and circular icon actions.
- Borders are low-contrast warm neutrals, not cool gray.
- Shadows are sparse, wide, and warm. They lift photography and primary cards; do not shadow every element.

### Icons and Images

- Use `lucide-react` for product icons. Use the existing `LeonlyLogo` for brand lockups.
- Default icon stroke is light-to-medium, matching nearby controls; use filled icons only for meaningful selected/favorite states.
- Treat photos as central content: use `object-fit: cover`, intentional aspect ratios, and rounded/framed presentation.
- Decorative images have empty `alt`; meaningful images have concise descriptive `alt` text.

## Layout Patterns

### Auth and Setup

- Use the existing centered shell, warm surface, dark patterned auth canvas, and split story/content layout from `space-setup-container`.
- On mobile, stack the story panel above the form content. At `md` and above, use the established two-column layout.
- Keep form content narrow (`31rem` to `34rem`), with centered mobile and left-aligned desktop copy.
- Use one clear primary action at the end of each step. Include back navigation when the flow permits it.

### App Screens

- Mobile-first: compact header, full-width content, and fixed bottom navigation where the app shell requires it.
- Desktop: permanent left sidebar beginning at `md` (`768px`) and content padding that scales with viewport width.
- Use a single prominent hero/milestone area followed by clearly separated sections.
- Timeline content can use cards and horizontally scrollable mobile rails; do not force a desktop grid into narrow screens.
- Place lists use compact cards with imagery or a category icon, concise metadata, and restrained ratings.

### Forms

- Use an explicit `<label>` for every control and connect validation with `aria-describedby` and `aria-invalid`.
- Preserve the existing input geometry: 3.35rem height, warm fill, burgundy focus border and 4px soft focus ring.
- Reserve error space where layout shift would be distracting. Errors use accessible text, not color alone.
- Use the existing `Button` for primary full-width form submits, including its loading state.
- For secondary actions, prefer a quiet bordered or tinted control. Do not add arbitrary button styles per screen.

## Interaction and Motion

- Interactions should feel soft and intentional: `160ms` to `300ms`, ease-out or the existing cubic-bezier curve.
- Use a small elevation/translate change for hoverable desktop controls; use a subtle scale-down for touch active states.
- Use one staggered entrance sequence per screen when it adds hierarchy. Dashboard uses `220ms` upward reveals as the reference.
- Respect `prefers-reduced-motion`. Motion must never block reading, input, navigation, or error recovery.
- Provide visible `:focus-visible` states. The established focus color is burgundy (`#b82b49`) with a 2px outline and offset.

## Accessibility and Responsive Requirements

- Use semantic landmarks, headings in order, real buttons for actions, and links for navigation.
- Do not convey state only through color, icon, or hover.
- Preserve keyboard access for menus, dialogs, calendars, and all actionable cards.
- Test at mobile, `sm` (640px), `md` (768px), and `lg` (1024px) breakpoints. Do not hide essential actions on mobile.
- Account for `env(safe-area-inset-bottom)` when a fixed mobile navigation is present.
- Preserve logical source order when layouts reflow.

## New Screen Checklist

Before implementation:

- Read this file and the closest existing screen.
- Identify the existing primitives and CSS module to reuse or extend.
- Select one primary action and define empty, loading, error, and success states.

Before review:

- [ ] Uses Fraunces/Nunito Sans and established warm palette.
- [ ] Reuses `Button`, shadcn/Radix primitives, `Skeleton`, and shared components where appropriate.
- [ ] Has mobile and desktop layouts matching the existing navigation pattern.
- [ ] Uses accessible labels, focus states, keyboard behavior, and appropriate image alt text.
- [ ] Respects reduced motion and does not add gratuitous animation.
- [ ] Does not introduce a new font, unrelated color system, generic dashboard widgets, or unneeded dependency.

## Implementation Rules for Agents

- Read `DESIGN.md` before creating or substantially changing a frontend screen.
- Match the closest existing feature before designing a new pattern.
- Keep page-specific styles in a co-located CSS module; keep global tokens in `globals.css` only when reused across features.
- Do not change global tokens, shared primitives, or navigation patterns without an approved design reason and coverage of existing consumers.
