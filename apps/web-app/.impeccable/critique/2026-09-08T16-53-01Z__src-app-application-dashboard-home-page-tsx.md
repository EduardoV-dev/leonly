---
target: web-app dashboard home
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/home/eduardovdev/workspace/leonly/apps/web-app/src/app/(application)/(dashboard)/(home)/page.tsx"
target_fingerprint: "sha256:e4f73986376e20e6da865d77eead054993ec123cb2384dd9379a8ec9d1375ccf"
target_path: /home/eduardovdev/workspace/leonly/apps/web-app/src/app/(application)/(dashboard)/(home)/page.tsx
timestamp: 2026-09-08T16-53-01Z
slug: src-app-application-dashboard-home-page-tsx
---
⚠️ DEGRADED: single-context (no sub-agent/Task tool exposed)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3 | Loading, retry, invite, and pagination states are explicit; the milestone briefly renders an empty heading during hydration. |
| 2 | Match System / Real World | 3 | Relationship language is natural, but several lines drift into generic keepsake marketing copy. |
| 3 | User Control and Freedom | 3 | Navigation, retries, and sidebar control are clear; the dashboard itself offers few reversible actions. |
| 4 | Consistency and Standards | 3 | The warm visual system is cohesive, but literal colors, radii, and type sizes drift from documented tokens. |
| 5 | Error Prevention | 3 | Guardrails and recovery are strong in invite and memory states; the reviewed surface has few destructive actions. |
| 6 | Recognition Rather Than Recall | 3 | Icons are labeled and destinations remain visible; the empty state omits the relevant creation action. |
| 7 | Flexibility and Efficiency | 2 | Creation is globally available and the desktop shell collapses, but there are no accelerators or task shortcuts. |
| 8 | Aesthetic and Minimalist Design | 3 | The editorial warmth is strong; repeated names, avatars, and identity copy spend too much prime space. |
| 9 | Error Recovery | 3 | Errors use plain language, preserve trust, and offer retry paths. |
| 10 | Help and Documentation | 1 | No contextual help or first-use guidance is visible where a new couple is most likely to need it. |
| **Total** | | **27/40** | **Acceptable: solid character, significant UX improvements needed** |

## Design Specificity Verdict

**LLM assessment:** Authored rather than category-interchangeable. Fraunces, blush paper, burgundy actions, relationship-day milestone, paired avatars, and memory chronology all reinforce Leonly's private keepsake premise. The specificity weakens in the generic copy and in a dashboard structure that behaves like a standard "welcome + stats + recent items" home screen.

**Deterministic scan:** 43 findings across the dashboard surface: 39 design-system advisories and 4 font warnings. The scan correctly caught extensive literal-value drift in dashboard CSS, especially `dashboard-sidebar.module.css`, plus off-ramp radii and type sizes. All four Fraunces warnings are false positives because `DESIGN.md` explicitly mandates Fraunces as Leonly's display face. Several tonal color advisories may also be intentional, but undocumented one-off values still make the system harder to maintain.

**Visual overlays:** No browser automation tool is exposed in this session, so mutable injection was unavailable and no reliable user-visible overlay exists. Evidence is based on current source, responsive CSS, rendered semantics, state handling, and the required CLI detector.

## Overall Impression

The dashboard feels tender, coherent, and recognizably Leonly. Its biggest opportunity is not more decoration: it is making the first viewport decisively useful. Right now the page celebrates the relationship, then repeats who the couple is, while the most important empty-state action is stranded in global navigation.

## What's Working

- The milestone card creates a genuine emotional peak using restrained color, editorial typography, and relationship-specific data.
- Mobile bottom navigation, desktop sidebar, visible focus treatments, semantic labels, safe-area padding, and reduced-motion variants form a dependable responsive shell.
- Loading and failure copy protects trust: "Your memories are safe" and concrete retry actions suit a private, high-emotion product.

## Priority Issues

### [P1] The empty memory state is a dead end

- **Why it matters:** A new couple reaches "No memories yet" at the exact activation moment, but receives no contextual path to create the first memory.
- **Fix:** Add one burgundy "Preserve your first memory" action inside the empty state, with copy that explains what happens next. Keep the global action, but do not make first-time users hunt for it.
- **Suggested command:** `/impeccable onboard`

### [P2] Prime dashboard space repeats identity instead of advancing the story

- **Why it matters:** Names and avatars appear in the shell, welcome heading, and member-summary card. The secondary hero card adds little information while competing with the milestone.
- **Fix:** Replace the member-summary card with useful relationship context, such as the latest memory cue or an invitation state; for two-member spaces, let the milestone own the hero.
- **Suggested command:** `/impeccable distill`

### [P2] Memory photography is framed like an attachment, not the product's emotional center

- **Why it matters:** `object-fit: contain` can introduce letterboxing inside fixed 4:3 cards, weakening the deliberate photographic treatment promised by `DESIGN.md`.
- **Fix:** Use `object-fit: cover` for recent-memory covers, preserve a safe focal treatment, and reserve `contain` for explicitly uncropped detail views.
- **Suggested command:** `/impeccable polish`

### [P2] The visual system is coherent by eye but fragmented in code

- **Why it matters:** Dozens of near-token colors, radii, and type sizes create subtle inconsistency and make later refinement risky.
- **Fix:** Map intentional tonal values to documented semantic variables, replace accidental near-matches, and keep Fraunces unchanged because it is a mandated brand choice.
- **Suggested command:** `/impeccable extract`

### [P2] Desktop heading hierarchy has two competing `h1` elements

- **Why it matters:** The sidebar space name and page welcome both become top-level headings, muddying document structure for screen-reader users and reinforcing the visual identity repetition.
- **Fix:** Keep the page title as `h1`; render the persistent space identity as non-heading brand text or a lower-level heading appropriate to the shell.
- **Suggested command:** `/impeccable audit`

## Cognitive Load

Moderate: 2 of 8 checklist items fail.

- **Visual hierarchy fails:** the welcome, milestone, and member summary all compete as identity-level content.
- **Minimal choices fails:** both mobile and desktop expose four destinations plus creation at once. This is only slightly over the four-item threshold, but creation should read as the unmistakable primary path.
- Grouping, chunking, working-memory demands, and state progression are otherwise strong.

The emotional journey starts warmly, peaks at the relationship milestone, then falls into a generic or empty recent-memory section. When no memories exist, the page ends on absence rather than hopeful momentum.

## Persona Red Flags

**Jordan, first-timer:** The global "Create a memory" action is visible, but "No memories yet" gives no local instruction or reassurance about timeline versus Vault. "Here is your shared universe" adds tone without clarifying the first task.

**Sam, accessibility-dependent:** Focus styles, labels, `aria-current`, live regions, and reduced motion are strong. The two desktop `h1` elements create an avoidable structural ambiguity, and avatar accessible names are hard-coded in English rather than localized.

**Casey, distracted mobile user:** Navigation targets are comfortably sized and safe-area aware, but the primary creation action remains at the top of the screen rather than in the thumb-zone navigation. The empty state does not recover that reachability problem with a local CTA.

## Minor Observations

- The milestone description, "Every moment captured, every memory cherished...," is polished but interchangeable with many photo-journal products.
- The continuously scrolling long space name is functional, but repeated ambient movement in a sticky header may distract even though reduced-motion behavior is handled.
- "Recent Memories" uses title case while nearby prose and several product actions use sentence case.
- The detector scanned dashboard loading and error states as part of the target directory; those findings are relevant to the surface but not all appear in the steady-state home view.

## Questions to Consider

- Should the dashboard primarily help couples create the next memory or revisit the relationship so far?
- If the member-summary card disappeared, what unique relationship signal deserves that space?
- Should photography be consistently immersive and cropped, or should preserving the full original frame take precedence?
