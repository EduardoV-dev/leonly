## 1. Active-space API

- [x] 1.1 Add the authenticated `GET /api/users/me/space` Nest endpoint using the current session user, non-deleted space and membership, active member projection, persisted invite, and date-only/ISO fields. Return `data: null` only when no eligible membership exists.
- [x] 1.2 Extend the spaces controller tests for current-member isolation, absent/deleted membership, nullable invite, unauthorized access, and query failure; align the optional creator-name fallback with the space-lifecycle spec.

## 2. Web session and routing boundary

- [x] 2.1 Add the same-origin GET proxy and update the server-only active-space lookup to forward the Better Auth cookie to Nest, validate its response, preserve request-local caching, and distinguish unauthenticated, absent, and failed lookups. Cover the proxy and lookup in focused tests.
- [x] 2.2 Migrate the create name/date guards, creator invite route, application layout, and dashboard entry to the same active-space lookup; remove their Supabase auth checks and verify create/setup redirects for no space, unauthorized session, and backend failure.

## 3. Creator invite and dashboard handoff

- [x] 3.1 Verify the create form sends the validated Nest payload and handles 400 field errors, 401/409 responses, and network failures without clearing values or navigating; keep the existing working POST proxy.
- [x] 3.2 Render and copy the current persisted invite on the creator interstitial after creation and refresh; show an unavailable state instead of a missing or expired code, while retaining dashboard continuation.
- [x] 3.3 Remove the creator invite's Supabase setup-completion request, since Nest marks the owner complete at creation; verify continuing enters the same space's one-member dashboard.
- [x] 3.4 Ensure the new-space dashboard shows a truthful waiting/empty state without executing unusable Supabase-only memory or invite-regeneration actions, while preserving legacy paths outside the new-space journey.

## 4. Verification

- [ ] 4.1 Exercise a Better Auth user through create, reload invite, copy code, and continue to dashboard; verify the negative cases and record any remaining legacy-only controls exposed on this path.
- [x] 4.2 Run `openspec validate migrate-space-creation-journey --strict`, focused API/web tests, and the required API and web-app check, typecheck, test, and build commands; fix any failures introduced by this change.
