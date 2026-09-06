## Context

See `proposal.md` for motivation. The client i18n module already registers English and Spanish
resources, initializes to English for hydration stability, detects browser locales after hydration,
persists `leonly.locale` in local storage, and synchronizes `document.documentElement.lang` when
`setLanguage` runs. A reusable language switcher currently serves authentication and onboarding, but
Settings intentionally renders a future-language placeholder.

The existing resolver uses the same permissive normalization for browser locales and stored values.
That correctly maps regional browser locales such as `es-MX` to Spanish, but it also treats a stored
`es-MX` value as valid even though US-031 permits only exact persisted `en` and `es` codes. Language
initialization also occurs in a provider effect after application children first render.

## Goals / Non-Goals

**Goals:**

- Make language resolution deterministic at the browser storage boundary.
- Add an accessible Settings-owned language selector that fits the existing personal-settings row.
- Prevent language-dependent application content from appearing before browser initialization settles.
- Verify immediate translation, persistence, document language, locale-sensitive formatting, and
  complete MVP translation coverage.

**Non-Goals:**

- Persisting language in Supabase, authentication metadata, membership rows, cookies, or server state.
- Synchronizing a choice across devices or browser profiles.
- Translating user-authored content or changing stored dates and names.
- Adding languages beyond English and Spanish or introducing a translation-management dependency.

## Decisions

### Keep the MVP preference device-local

Continue using the established `leonly.locale` local-storage key and do not add a server mutation or
data-model field. The story requires independence between browser profiles, and account synchronization
would add authentication and migration coupling without improving the MVP contract. Account-synchronized
preferences remain a post-MVP product decision.

Alternative considered: store language on the user or membership. This would make preferences portable
but would contradict device-local independence and expand US-031 into a cross-device data feature.

### Separate stored-value validation from browser-locale detection

Retain regional normalization for `navigator.languages`, but parse persisted values through an exact
`en`/`es` allowlist. Missing storage falls through to browser detection; any present but unsupported or
malformed value resolves deterministically to English. Keep these transformations pure and directly
tested.

Alternative considered: continue passing stored values through `normalizeLanguage`. That is smaller,
but incorrectly accepts regional or prefix-like saved values as explicit supported choices.

### Gate language-dependent content until client initialization completes

Extend the application provider with a language-ready state. After hydration, initialize i18n from the
strict stored preference or browser locales, synchronize the document language, and only then reveal
application children. Use a stable, non-language-dependent loading presentation while initialization is
pending so server and initial client markup remain deterministic.

Alternative considered: render English immediately and switch in the existing effect. That preserves
hydration but can visibly flash the wrong language and does not satisfy loading-safe initialization.
Reading local storage during server rendering is impossible, while moving the preference to a cookie
would replace the established local-storage approach and add request coupling.

### Use a Settings-owned native selection control

Create one page-owned language selector beside the Settings page, using a labelled `fieldset` and native
radio inputs for built-in selected semantics and keyboard behavior. The component calls the shared
language boundary, keeps focus on the selected option, and announces completion through a polite status
region. Its styles remain co-located and reuse the established Settings palette and control geometry.

Alternative considered: insert the existing animated authentication switcher directly. Its auth
namespace, pill styling, entrance motion, and layout margins are coupled to authentication/onboarding and
do not match the Settings value-row semantics. A page-owned control avoids weakening that component's API
or importing auth presentation into Settings.

### Treat translation completeness as part of the feature

Audit every completed MVP route and shared component for user-visible hard-coded strings, register any
missing namespace resources in both languages, and retain key-parity tests. Locale-sensitive dates MUST
derive from the active language so they update in the same render as translated labels.

Alternative considered: limit verification to Settings. That would ship a selector that produces a
mixed-language MVP and directly violate the story's cross-feature acceptance criteria.

## Risks / Trade-offs

- [Global readiness gating delays first content until a client effect completes] -> Keep initialization
  synchronous except for the existing i18n language-change promise and render a lightweight stable state.
- [Local storage can be unavailable in restricted browser contexts] -> Isolate storage access, fall back
  safely to English, and still synchronize in-memory i18n and the document language.
- [A translation audit can expand beyond the selector itself] -> Limit the audit to completed MVP routes
  and user-visible product copy; keep user-authored content and developer diagnostics out of scope.
- [Two language controls can diverge behavior] -> Keep persistence and language mutation in the shared
  i18n boundary while allowing presentation to remain context-specific.

## Migration Plan

1. Harden and test language resolution and initialization before exposing the Settings control.
2. Add the Settings selector, translations, and focused accessibility/interaction coverage.
3. Audit completed MVP surfaces and complete English/Spanish resource parity.
4. Run the full web-app check, typecheck, test, and production-build gates.

Rollback removes the Settings selector and readiness gate while retaining the existing English-first
i18n behavior. No persisted schema or server data requires rollback.
