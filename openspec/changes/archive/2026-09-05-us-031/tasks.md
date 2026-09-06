## 1. Language Resolution And Initialization

- [x] 1.1 Separate exact persisted-language validation from regional browser-locale detection, guard
  unavailable browser storage, and preserve the `en`/`es`-only device-local contract without adding
  account, membership, or server persistence.
- [x] 1.2 Extend i18n unit coverage for exact English and Spanish selections, regional Spanish browser
  locales, unsupported browser locales, malformed or unsupported saved values, storage precedence,
  deterministic English fallback, and independent browser profiles.
- [x] 1.3 Add loading-safe provider initialization that resolves browser-only preferences before
  revealing language-dependent application content and keeps the i18n language and document `lang`
  attribute synchronized.
- [x] 1.4 Test provider initialization for hydration-safe loading, refresh-equivalent startup,
  unavailable storage, document-language synchronization, and persistence across sign-out/sign-in
  component transitions.

## 2. Settings Language Selector

- [x] 2.1 Add a page-owned Settings language selector with a labelled native selection group, exact
  English and Spanish options, selected semantics, keyboard operation, preserved focus, one change at
  a time, and polite completion announcements.
- [x] 2.2 Add co-located responsive styles that extend the existing personal-settings value row on
  mobile and desktop without changing global tokens, shared primitives, or auth/onboarding styling.
- [x] 2.3 Replace the Settings language placeholder with the selector and add complete English and
  Spanish labels, option names, help text, pending text, and completion feedback.
- [x] 2.4 Extend Settings interaction tests for the initial selected language, immediate English and
  Spanish changes, local persistence, no network or shared-data mutation, keyboard selection, focus,
  selected state, announcements, document `lang`, and responsive source order.

## 3. Completed-MVP Translation Coverage

- [x] 3.1 Audit every completed MVP route, shared shell, loading/error/not-found state, and reusable
  component for user-visible hard-coded interface strings and missing English/Spanish namespace keys,
  excluding user-authored content and developer-only diagnostics.
- [x] 3.2 Move uncovered interface copy into the narrowest existing locale namespace, add equivalent
  English and Spanish resources, and strengthen resource-key parity tests so either language remains
  structurally complete.
- [x] 3.3 Add focused cross-feature coverage proving an in-place language change updates completed MVP
  copy and locale-sensitive dates while preserving names, comments, memories, stored dates, and other
  user-authored values.

## 4. Verification

- [x] 4.1 Run the focused i18n, provider, Settings, and affected feature tests and resolve regressions.
- [x] 4.2 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
  `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`, then resolve any failures.
