---
name: Leonly
description: A warm private keepsake for two people to preserve and revisit their shared history.
colors:
  keepsake-burgundy: "#8a6467"
  keepsake-burgundy-deep: "#7d585d"
  brand-plum: "#7f5a5f"
  focus-berry: "#b82b49"
  blush-paper: "#f5efee"
  warm-canvas: "#fffdfc"
  warm-white: "#fffafd"
  blush-highlight: "#fff4f3"
  quiet-lavender: "#eee4f0"
  ink: "#252323"
  body-copy: "#635b59"
  muted-copy: "#8f8280"
  warm-border: "#dfd4d2"
  destructive: "hsl(0 84.2% 60.2%)"
typography:
  display:
    fontFamily: "Fraunces, Georgia, Times New Roman, serif"
    fontSize: "clamp(2.35rem, 8vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 0.96
  headline:
    fontFamily: "Fraunces, Georgia, Times New Roman, serif"
    fontSize: "1.55rem"
    fontWeight: 600
    lineHeight: 1.1
  title:
    fontFamily: "Fraunces, Georgia, Times New Roman, serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.1
  body:
    fontFamily: "Nunito Sans, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.55
  label:
    fontFamily: "Nunito Sans, Segoe UI, sans-serif"
    fontSize: "0.68rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.15em"
rounded:
  action: "0.6rem"
  card: "0.75rem"
  control: "0.8rem"
  panel: "1rem"
  shell-mobile: "1.45rem"
  shell-desktop: "1.75rem"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.keepsake-burgundy}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.action}"
    padding: "0 1rem"
    height: "3.5rem"
  button-primary-hover:
    backgroundColor: "{colors.keepsake-burgundy-deep}"
    textColor: "{colors.warm-white}"
  button-quiet:
    backgroundColor: "rgb(127 90 95 / 0.13)"
    textColor: "{colors.brand-plum}"
    rounded: "0.7rem"
    padding: "0 1rem"
    height: "2.75rem"
  input:
    backgroundColor: "#f6f2ee"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "3.35rem"
  card-memory:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "1rem"
---

# Design System: Leonly

## Overview

**Creative North Star: "The Shared Keepsake"**

Leonly should feel like a carefully kept object shared by two people: warm, tactile, intimate, and
quietly premium. Blush paper-like surfaces, framed photography, editorial headings, and restrained
burgundy actions give persisted memories emotional weight without turning the product into a public
scrapbook.

The interface stays calm and dependable. Generous whitespace and soft layers support reflection,
while clear hierarchy, honest states, and conventional controls keep private workflows easy to use.
Expression belongs in meaningful imagery and precise details, not decorative UI noise.

**Key Characteristics:**

- Warm paper surfaces rather than cold gray application chrome.
- Editorial Fraunces headings paired with sturdy Nunito Sans controls and copy.
- One scarce burgundy primary action, with lavender reserved for private-vault context.
- Photography treated as content through deliberate framing and aspect ratios.
- Soft, purposeful motion with complete reduced-motion behavior.

## Colors

The palette is warm and tactile: burgundy provides confidence, blush surfaces provide calm, and quiet
lavender distinguishes private-vault context without competing with the brand.

### Primary

- **Keepsake Burgundy:** The single prominent action color for submit controls and creation links.
- **Brand Plum:** Brand marks, icons, labels, and restrained interactive emphasis.
- **Focus Berry:** Visible keyboard focus outlines; it is functional rather than decorative.

### Secondary

- **Blush Highlight:** Gentle media placeholders and warm selected surfaces.
- **Quiet Lavender:** Vault cards, lock badges, and private categorization only.

### Neutral

- **Warm Canvas:** Default application canvas and translucent navigation foundation.
- **Blush Paper:** Auth, setup, and desktop shell surface.
- **Ink:** Primary headings and high-emphasis content.
- **Body Copy:** Descriptions and supporting instructions.
- **Muted Copy:** Legal text, metadata, placeholders, and low-emphasis notes.
- **Warm Border:** Low-contrast boundaries between related warm surfaces.

**The One Voice Rule.** Use burgundy for the single primary action in a view; never introduce a
competing saturated call-to-action color.

**The Private Lavender Rule.** Lavender signals vault context or quiet categorization. It never
replaces burgundy as the product's primary voice.

## Typography

**Display Font:** Fraunces (with Georgia and Times New Roman fallbacks)  
**Body Font:** Nunito Sans (with Segoe UI and sans-serif fallbacks)

**Character:** Fraunces gives memories and milestones an editorial, sentimental voice. Nunito Sans
keeps navigation, forms, metadata, and long-form copy approachable and operational.

### Hierarchy

- **Display** (700, fluid 2.35rem to 3.25rem, 0.96): Setup and emotionally important page headings.
- **Headline** (600, 1.55rem, approximately 1.1): Product identity and prominent section headings.
- **Title** (600, 1.2rem, 1.1): Memory and card titles.
- **Body** (600, 1rem, 1.55): Instructions and primary descriptive copy; keep reading measures near
  25rem to 34rem in focused flows.
- **Label** (700-900, 0.62rem to 0.72rem, up to 0.15em tracking): Compact metadata and form labels;
  uppercase only when it clarifies hierarchy.

**The Two-Voice Rule.** Use Fraunces for emotional hierarchy and Nunito Sans for operation. Do not
introduce a third font family.

## Layout

Leonly is mobile-first. App screens use a compact header, full-width content, and fixed bottom
navigation with safe-area padding. At the medium breakpoint (768px), navigation becomes a permanent
left sidebar and content moves into a two-column shell. The sidebar is 14.25rem wide by default,
15.5rem at large sizes, and can collapse to approximately 5.25rem.

Auth and setup flows sit in a centered shell capped at 78rem. The story panel stacks over the content
on mobile and becomes the left half of a split layout at 768px. Focused form content remains between
31rem and 34rem wide. Spacing follows a loose 0.5rem rhythm with deliberate 1rem, 1.5rem, and 2rem
section intervals rather than dense dashboard packing.

Memory timelines may use stacked cards and horizontal mobile rails. At wider sizes, featured memory
cards can split photography and text into asymmetric columns. Preserve logical source order whenever
the composition reflows.

**The Breathing-Room Rule.** Favor one prominent milestone or hero followed by clearly separated
sections; do not compress shared memories into dense data-table layouts.

## Elevation & Depth

Depth is layered and ambient, not ornamental. Most surfaces are separated by warm tonal changes and
fine borders. Wide, low-opacity shadows lift primary shells, photography, and exceptional cards;
ordinary controls and every nested surface must not receive their own shadow.

### Shadow Vocabulary

- **Auth shell** (`0 22px 54px rgb(17 15 15 / 0.25)`): The large setup shell against the dark canvas.
- **Lifted card** (`0 24px 60px rgb(99 70 73 / 0.1)`): Important date and focused content cards.
- **Vault ambient** (`0 14px 35px rgb(83 56 78 / 0.07)`): Subtle private-vault distinction.
- **Mobile navigation** (`0 -6px 20px rgb(67 47 48 / 0.05)`): Separation from scrolling content.

**The Ambient-Only Rule.** A shadow must clarify layer or interaction state. Use a warm border or
tonal surface when elevation is not semantically necessary.

## Shapes

The form language is gently curved and tactile. Standard controls use a 0.8rem radius, memory cards
use 0.75rem, focused panels use 1rem, and large setup shells expand from 1.45rem on mobile to 1.75rem
on desktop. Compact status badges and circular icon actions may be fully rounded. Borders remain thin
and warm; hard square corners and exaggerated pill containers are exceptions, not defaults.

**The Nested-Corners Rule.** Outer shells have the largest radius, internal cards step down, and
controls remain smaller. Preserve this hierarchy when surfaces nest.

## Components

Components should feel soft and confident: clear enough for dependable operation, restrained enough
to keep the shared content in focus.

### Buttons

- **Shape:** Gently curved for primary actions (0.6rem to 1rem depending on scale).
- **Primary:** Keepsake Burgundy with warm-white text, strong 600-900 weight, and one clear action per
  view. Full-width form submits are 3.5rem tall; compact actions are 2.75rem tall.
- **Hover / Focus:** Lift by no more than 2px over 160-300ms. Use the Focus Berry 2px outline with
  offset for keyboard focus. Disabled buttons remain legible and do not lift.
- **Quiet:** Use a translucent Brand Plum tint, Brand Plum text, and no competing saturation.

### Chips

- **Style:** Compact circular badges or restrained tinted tabs. Use full rounding only for status,
  rating, category, or icon-sized content.
- **State:** Selection combines color with an underline, fill, icon, or explicit label; never rely on
  color alone.

### Cards / Containers

- **Corner Style:** Gently curved memory cards (0.75rem) and focused panels (1rem).
- **Background:** White or Warm Canvas over Blush Paper; Vault cards may use Quiet Lavender tints.
- **Shadow Strategy:** Flat by default. Apply only a named ambient shadow when the card needs semantic
  lift.
- **Border:** One-pixel warm-neutral border.
- **Internal Padding:** 1rem for compact cards and 1.35rem for featured memory content.

### Inputs / Fields

- **Style:** Warm off-white fill, subtle plum-tinted border, 0.8rem radius, and 3.35rem height.
- **Focus:** Shift to a warmer white, strengthen the plum border, and add a 4px soft plum ring.
- **Error / Disabled:** Pair accessible text with `aria-invalid` and `aria-describedby`; reserve error
  space where movement would interrupt the form.

### Navigation

- **Desktop:** Permanent sidebar from 768px, with 2.75rem rows, quiet rounded active fills, concise
  labels, and an optional collapsed icon-only state with accessible names.
- **Mobile:** Fixed bottom navigation on Warm Canvas with safe-area padding, compact uppercase labels,
  and color plus `aria-current` for the active destination.
- **States:** Hover and active movement remain subtle; every link has a visible Focus Berry outline.

### Photography

Photography is primary content. Use deliberate aspect ratios, rounded or framed presentation, and
`object-fit: cover` when cropping supports the composition. Meaningful images require concise alt
text; decorative imagery uses an empty alt attribute.

## Do's and Don'ts

### Do:

- **Do** reuse semantic variables and existing primitives before adding a token or component.
- **Do** give each view one obvious burgundy primary action and quiet secondary actions.
- **Do** preserve mobile bottom navigation, desktop sidebar, logical source order, and safe-area
  padding.
- **Do** define honest empty, loading, unavailable, error, and success states using persisted product
  truth.
- **Do** keep interactions between 160ms and 300ms and provide equivalent reduced-motion behavior.
- **Do** use semantic landmarks, ordered headings, explicit labels, keyboard-operable controls, and
  visible focus states.

### Don't:

- **Don't** introduce cold SaaS dashboard chrome, dense data tables, or hard pure-black contrast.
- **Don't** add glassmorphism, unrelated gradients, generic stock-shadcn styling, or a third font.
- **Don't** use lavender as the main call-to-action color or create multiple saturated CTAs.
- **Don't** shadow every element, overuse pills, or add decorative motion without purpose.
- **Don't** fabricate memories, people, places, metrics, testimonials, or proof.
- **Don't** change global tokens, shared primitives, or navigation patterns without an approved design
  reason and coverage of existing consumers.
