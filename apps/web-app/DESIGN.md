---
name: Leonly
description: A private, tactile archive for two people's shared history.
colors:
  canvas: "#fffdfc"
  surface: "#ffffff"
  surface-warm: "#fff4f3"
  surface-muted: "#f6f2ee"
  brand-mauve: "#7f5a5f"
  brand-action: "#8a6467"
  accent-rose: "#b82b49"
  heading-ink: "#252323"
  body-ink: "#635b59"
  border-warm: "#dfd4d2"
  vault-lilac: "#eee4f0"
  auth-canvas: "#151519"
  auth-canvas-raised: "#1f2026"
  action-border: "#7d585d"
  action-text: "#fffdfd"
typography:
  display:
    fontFamily: "Petrona, Georgia, Times New Roman, serif"
    fontSize: "clamp(2.35rem, 8vw, 3.25rem)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Nunito Sans, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Nunito Sans, Segoe UI, sans-serif"
    fontSize: "0.68rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.06em"
rounded:
  control: "0.6rem"
  card: "0.75rem"
  feature: "1rem"
  pill: "999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.25rem"
  xl: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.brand-action}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.control}"
    padding: "0 1rem"
    height: "2.75rem"
  button-compact:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.heading-ink}"
    rounded: "{rounded.control}"
    padding: "0 0.75rem"
    height: "2.75rem"
  input:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.heading-ink}"
    rounded: "{rounded.control}"
    padding: "0 0.9rem"
    height: "3.35rem"
  memory-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.heading-ink}"
    rounded: "{rounded.card}"
    padding: "1.2rem"
---

# Design System: Leonly

## Overview

**Creative North Star: "El Archivo Intimo"**

Leonly feels like a carefully kept private archive rather than a social feed. Editorial display type
gives memories emotional weight, while warm paper-like surfaces and restrained mauve accents keep the
application calm, personal, and dependable.

The component character is refined and tactile: fine warm borders define structure, soft ambient
shadows lift only important keepsakes, and short movements acknowledge interaction without turning the
shared history into spectacle.

**Key Characteristics:**
- Warm near-white canvases with dusty mauve and selective rose accents.
- Petrona for emotionally significant headings; Nunito Sans for all operational text.
- Rounded, bordered surfaces with quiet depth and generous breathing room.
- Mobile-first stacking that becomes editorially asymmetric on wider screens.

## Colors

The palette combines warm paper neutrals, muted mauve controls, and rare rose emphasis.

### Primary
- **Archive Mauve:** The identity color for branding, icons, and active navigation.
- **Keepsake Mauve:** The stronger action color for primary controls.
- **Pressed Rose:** Reserved for focus, milestones, and emotionally important emphasis.

### Tertiary
- **Vault Lilac:** Distinguishes private-vault surfaces without making them feel like another product.

### Neutral
- **Private Canvas:** The principal application canvas.
- **Clean Paper:** The default card surface.
- **Blushed Paper:** A warm feature surface for milestones and memory placeholders.
- **Soft Linen:** A tactile field and secondary-control surface.
- **Near-Black Ink:** High-contrast display and control text.
- **Warm Graphite:** Supporting copy.
- **Pressed Border:** Fine separation between warm surfaces.
- **Night Archive:** The near-black authentication surround and its subtly raised companion tone.
- **Action Paper:** Near-white text reserved for controls on mauve or dark surfaces.

### Named Rules

**The Rare Rose Rule.** Rose marks focus or emotional significance; it does not flood routine screens.

## Typography

**Display Font:** Petrona (with Georgia and Times New Roman fallbacks)  
**Body Font:** Nunito Sans (with Segoe UI and sans-serif fallbacks)

**Character:** Petrona makes names, dates, and memories feel authored and lasting. Nunito Sans keeps
navigation, forms, metadata, and explanations friendly and highly legible.

### Hierarchy
- **Display:** Semibold, tightly tracked, balanced headings for page titles and major milestones.
- **Title:** Semibold Petrona around 1.2rem to 1.55rem for memory and section titles.
- **Body:** Regular or semibold Nunito Sans at 0.9rem to 1rem with relaxed line height.
- **Label:** Extra-bold Nunito Sans around 0.68rem, often uppercase with deliberate tracking.

### Named Rules

**The Memory Has a Voice Rule.** Petrona names meaningful content; Nunito Sans operates the product.

## Layout

Layouts begin as a single, padded vertical flow and preserve bottom safe-area space on mobile. At the
medium breakpoint (768px), persistent navigation appears, page padding expands, and memory content can
shift into asymmetric two-column compositions. Main reading regions stay centered and capped near
78rem. Spacing follows a compact 0.5rem to 1.5rem rhythm, with 2.75rem to 4rem separating major sections.

## Elevation & Depth

The system is layered, not glossy. Most surfaces rely on a one-pixel warm border; feature keepsakes use
large, low-opacity ambient shadows. Hover elevation is limited to a one- or two-pixel translation, and
reduced-motion preferences remove nonessential movement.

### Shadow Vocabulary
- **Keepsake lift:** `0 24px 60px rgb(99 70 73 / 0.1)` for emotionally prominent feature cards.
- **Vault lift:** `0 14px 35px rgb(83 56 78 / 0.07)` for private-vault memory cards.
- **Auth panel:** `0 22px 54px rgb(17 15 15 / 0.25)` against the dark authentication canvas.

### Named Rules

**The Border Before Shadow Rule.** Use a warm border for ordinary structure; add shadow only when a
surface needs narrative or modal prominence.

## Shapes

Controls use gently curved 0.6rem corners, cards use 0.75rem, and feature regions use 1rem. Fully round
shapes are reserved for avatars, icon medallions, status markers, and compact labels. Nested borders may
create a keepsake-frame effect, but decorative rounding should not obscure layout hierarchy.

## Components

### Buttons
- **Shape:** Compact controls use 0.6rem to 0.7rem corners; large auth actions use 1rem.
- **Primary:** Muted mauve background with near-white text and a minimum 2.75rem touch height.
- **Hover / Focus:** Slight upward translation on hover; a two-pixel rose outline with offset on focus.
- **Secondary / Ghost:** Transparent or pale mauve surfaces with warm ink.
- **Touch Target:** Interactive controls maintain a 2.75rem minimum target across pointer types.

### Chips
- **Style:** Pill-shaped, lightly bordered paper surfaces with uppercase extra-bold labels.
- **State:** Use rose or mauve to communicate emphasis, never color alone for status.

### Cards / Containers
- **Corner Style:** 0.75rem for memory cards and 1rem for feature compositions.
- **Background:** Clean paper by default; blushed paper or vault lilac for semantic distinction.
- **Shadow Strategy:** Flat by default, ambient lift for milestone and vault surfaces.
- **Border:** One-pixel warm neutral or low-opacity rose.
- **Internal Padding:** Usually 1.2rem to 1.5rem.

### Inputs / Fields
- **Style:** Warm off-white fill, one-pixel pressed border, 0.6rem corners, and at least 3.35rem height.
- **Focus:** Branded border plus visible outline or a soft four-pixel mauve ring.
- **Error / Disabled:** Pair color with explicit text and preserve readable contrast.

### Navigation
- **Style:** Quiet vertical navigation on desktop and compact mobile navigation. Active destinations
  use a pale mauve surface, heavier text, and a narrow mauve marker; hover movement is subtle.

### Disclosures
- **Reaction Picker:** A labelled disclosure group with independently tabbable toggle buttons. It does
  not claim application-menu semantics.

## Do's and Don'ts

### Do:
- **Do** keep memory content visually dominant over product chrome.
- **Do** use warm borders, calm motion, and visible focus states to make interactions feel dependable.
- **Do** preserve honest empty and waiting states with the same visual care as populated screens.

### Don't:
- **Don't** turn the palette into bright red romance branding or generic social-media gradients.
- **Don't** use Petrona for dense controls, metadata, or long operational copy.
- **Don't** stack shadows on every card; depth is meaningful because most surfaces remain quiet.
