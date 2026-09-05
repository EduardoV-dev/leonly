## 1. Secure Settings Data

- [x] 1.1 Add the `get_active_space_settings` migration with session-derived authorization, narrow
  member fields, current-member identity, safe function configuration, and authenticated-only grants.
- [x] 1.2 Implement the typed server-only Settings read model, including verified email/provider
  normalization, date-only values, one-member/two-member state, and null/error handling.
- [x] 1.3 Add focused web tests for successful, one-member, two-member, missing optional-data,
  unauthenticated, no-active-space, failed-read, and no-client-selected-resource behavior.

## 2. Application Shell And Routing

- [x] 2.1 Add the Settings route constant and a shared dashboard-section type, then enable Settings in
  desktop and mobile navigation with correct `aria-current` behavior.
- [x] 2.2 Add the thin `/settings` route inside the authenticated dashboard group and preserve the
  existing authentication and no-active-membership redirects.
- [x] 2.3 Add shell and route tests covering Settings navigation, active state, setup redirect, and the
  absence of a space-selecting route parameter.

## 3. Settings Presentation

- [x] 3.1 Build the responsive Settings page structure and co-located styles using the established
  editorial typography, warm surfaces, logical mobile source order, and asymmetric desktop layout.
- [x] 3.2 Implement the shared-space summary and shared-value sections with timezone-neutral date
  formatting and non-interactive extension regions for later edit stories.
- [x] 3.3 Implement one-member/two-member invite status and active-member presentation with stable
  keys, joined dates, current-member labeling, avatar fallback, and textual status cues.
- [x] 3.4 Implement the current-member preferences section with display-name ownership copy and
  non-interactive extension regions for display-name and language stories.
- [x] 3.5 Implement the privacy-limited account section and a separate accessible sign-out control that
  clears the Supabase session and returns the user to authentication.
- [x] 3.6 Implement the shared Private Vault callout and link with accurate active-member privacy copy
  and no unsupported synchronization, encryption, presence, entry-count, or version claims.

## 4. States, Accessibility, And Verification

- [x] 4.1 Add route-level labelled loading skeletons and a generic failed-read boundary with keyboard-
  accessible retry behavior and no stale protected values.
- [x] 4.2 Add behavior tests for headings, ownership labels, member and invite variants, account
  fallbacks, Vault navigation, sign-out, keyboard focus, non-color status, and responsive landmarks.
- [x] 4.3 Add Settings interface copy to the appropriate localization resources and verify accessible
  names remain meaningful in each currently supported locale.
- [x] 4.4 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
  `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`, then resolve every failure.
