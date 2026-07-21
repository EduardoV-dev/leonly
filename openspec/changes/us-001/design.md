## Context

The dashboard authenticates the user and reads the caller's active space through `get_active_space`, but renders fixed Unsplash memories and rankings. The database has no memory or place tables yet. The active-space response exposes member display names but not avatars, and the page has no dedicated loading or recovery UI.

## Goals / Non-Goals

**Goals:**
- Keep all dashboard data scoped to the authenticated member's active space.
- Replace fabricated records with truthful empty states until their owning features deliver persisted data.
- Provide member avatar fallbacks, a one-member waiting state, and recoverable loading and failure states.
- Define the dashboard integration boundary for later memory and place queries.

**Non-Goals:**
- Add memory, place, rating, or settings storage and write flows.
- Calculate or change the day-counter rules; US-002 owns that behavior.
- Implement the future add-memory destination before US-004 provides it.

## Decisions

- Extend the existing `get_active_space` RPC response with active member presentation data, including optional avatar URLs, rather than adding a separate unscoped member query. The RPC already enforces active-space ownership. A client-side profile query would be unable to read the other member under the current RLS policy.
- Render section empty states when no persisted records are available. Do not retain sample records or substitute generic content; a shared-space dashboard must not suggest user data that does not exist.
- Keep memory and place retrieval behind the dashboard's server-side data boundary once their tables exist. Each query will filter to the active space and apply the owning feature's visibility/activity rules. No provisional table or API is added here.
- Use Next.js route `loading` and `error` boundaries for initial load and recoverable server-query failure states. Redirects for unauthenticated, no-space, and unfinished-onboarding cases remain server-side.
- Represent a one-member space explicitly with an invitation/waiting state based on the active-member count, not by inferring it from rendered names.

## Risks / Trade-offs

- [The dashboard cannot show real memories or rankings before their features exist] -> Empty states make that absence explicit; wire real queries only after US-003/004 and US-014-017 provide schemas and access rules.
- [RPC presentation data can diverge from its TypeScript type] -> Update the SQL projection and `ActiveSpace` type together and cover both two-member and one-member responses in tests.
- [Error boundaries do not handle expected redirects] -> Preserve redirects before dashboard rendering and use the boundary only for unexpected loading failures.
