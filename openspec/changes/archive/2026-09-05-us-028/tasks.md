## 1. Membership Data Contract

- [x] 1.1 Add a Supabase migration that includes each active member's `updated_at` revision in
  `get_active_space_settings()` without changing its membership-derived authorization.
- [x] 1.2 Add the security-definer `update_active_membership_display_name` RPC with strict trimmed
  2-100-character validation, row locking, post-lock availability checks, optimistic revision
  comparison, identity-free parameters, generic unavailable outcomes, and authenticated-only grants.
- [x] 1.3 Extend the Settings runtime schema and `SettingsMember` mapping with the membership revision,
  then update read-model fixtures and tests for exactly one current member and strict RPC parsing.

## 2. Server Mutation Boundary

- [x] 2.1 Implement the server-only display-name request schema and RPC response parser with explicit
  `updated`, `conflict`, `invalid`, and `unavailable` domain outcomes.
- [x] 2.2 Test the server service for trimming and validation boundaries, authenticated RPC arguments,
  conflict metadata, unavailable state, database failures, and malformed RPC responses.
- [x] 2.3 Add `PATCH /api/membership/display-name` with a strict identity-free request body and map
  success, validation, conflict, unavailable, malformed JSON, and unexpected failures to the existing
  generic HTTP response conventions.
- [x] 2.4 Test the route for all status mappings, duplicate or altered identity fields, under-limit and
  over-limit input, whitespace normalization, inactive membership, and non-disclosing failures.

## 3. Settings Display-Name Editor

- [x] 3.1 Add a page-owned `useDisplayNameEditor` that manages canonical name, preserved draft,
  membership revision, validation attempts, one-request-at-a-time pending state, cancel, success,
  failure, and explicit conflict reconciliation.
- [x] 3.2 Test the hook for 2-100 Unicode-character boundaries, trimming, cancel without a request,
  duplicate-save prevention, successful canonical reconciliation, conflict accept and retry paths,
  and failure retry without losing input.
- [x] 3.3 Add the accessible inline `DisplayNameEditor` to the personal-settings section using the
  existing Settings controls and visual language, with focus entry, label and error association,
  keyboard operation, and announced pending, success, conflict, and failure states.
- [x] 3.4 Promote the Settings page's active-member values to canonical client state so a successful
  save immediately updates every rendered occurrence of the current member while the partner remains
  read-only, then request an authoritative route refresh.
- [x] 3.5 Add English and Spanish display-name editor copy and the minimal co-located responsive styles
  needed for mobile and desktop layouts without changing shared primitives or global tokens.
- [x] 3.6 Extend Settings component tests for self-only edit controls, partner protection, validation,
  pending controls, success, cancel, conflict, failure retry, focus behavior, keyboard use, accessible
  names, error association, and live feedback.

## 4. Attribution And Verification

- [x] 4.1 Add focused comment-read coverage proving refreshed historical comments resolve the current
  membership display name while the comment record remains unchanged.
- [x] 4.2 Add focused memory-detail and any existing place/creator-read coverage proving refreshed
  historical attribution resolves from membership without rewriting authored records.
- [x] 4.3 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
  `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`, then resolve any regressions.
