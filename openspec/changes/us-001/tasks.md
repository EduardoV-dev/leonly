## 1. Active-space presentation data

- [x] 1.1 Extend `get_active_space` and its TypeScript result type with ordered active-member avatar presentation data.
- [x] 1.2 Add tests for two-member and one-member active-space responses, including missing avatars.

## 2. Truthful dashboard states

- [x] 2.1 Remove hard-coded memory and place records and render responsive empty states when those capabilities have no persisted data.
- [x] 2.2 Render the one-member invitation/waiting state and safe member-avatar fallbacks.
- [x] 2.3 Preserve the server-side active-space boundary for future memory and place queries without creating premature storage or routes.

## 3. Route feedback and verification

- [x] 3.1 Add dashboard loading and recoverable error route states with a retry action.
- [x] 3.2 Add tests for unauthenticated, no-space, incomplete-onboarding, one-member, empty, query-error, and active-space isolation behavior.
- [x] 3.3 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`, `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`.
