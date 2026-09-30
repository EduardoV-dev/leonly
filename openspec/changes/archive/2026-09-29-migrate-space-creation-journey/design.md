## Context

See [proposal.md](proposal.md) for motivation. `POST /api/spaces` already forwards the browser request to Nest, where the Better Auth guard supplies the actor and Prisma creates the space, owner membership, and invite together. The success envelope contains only `space_id`. By contrast, `getActiveSpaceForCurrentUser`, the create-page guards, the invite route, the application layout, and the dashboard still use a Supabase session or `get_active_space` RPC. The owner's `onboardingCompletedAt` is already set by Nest creation, but the invite continuation still posts to a Supabase completion RPC.

The dashboard shell consumes an `ActiveSpace` shape with `active_members`, `member_names`, `start_date`, and invite fields. Its recent-memories and partner-invite controls have separate legacy Supabase routes. The Nest Prisma model has space and membership records but no migrated memory operations; this change must not claim that those routes work for a Better Auth-only account.

## Goals / Non-Goals

**Goals:**

- Carry the session identity through creation, the server-rendered invite route, and the new-space dashboard entry.
- Preserve the persisted invite across reloads and avoid misleading users when it is no longer valid.
- Keep the current create request and dashboard shell contracts small and testable.

**Non-Goals:**

- Migrate join, invite regeneration, settings, memory creation, or memory history endpoints.
- Add duplicate invite storage in the browser or return the invite from the create response.
- Redesign the setup or dashboard screens.

## Decisions

### Read current membership through Nest

Add `GET /api/users/me/space` to a new users controller, backed by the existing `SpacesService` query. Select a non-deleted membership and space using the Better Auth session user ID, then select only active members. Return the fields of the existing `ActiveSpace` shape (snake_case, date-only start date, ISO timestamps, nullable invite and avatar). Use the existing success envelope with `data: null` when no active membership exists; let the global exception filter handle unauthorized or unexpected failures. Do not accept a user ID or space ID from the request.

Using the existing response shape avoids a second client model and changes fewer dashboard consumers. Returning the invite from the create POST alone was rejected because refreshes and direct navigation would lose it. Querying the old Supabase RPC with a Better Auth ID was rejected because Supabase auth context cannot authorize that identity.

### Keep the Next.js same-origin boundary

Add a GET handler for `/api/users/me/space` using the existing `proxyRequest`. For server-rendered routes, update the existing server-only `getActiveSpaceForCurrentUser` helper to call Nest with the request's Better Auth cookie and validate the envelope and payload. Keep request-scoped caching only; never put session cookies or private space data in a cross-request cache. Return `null` only for a successful `data: null`, and surface transport, malformed response, and unexpected status failures as errors. Reuse that helper for create-route guards, invite, application layout, and dashboard entry; remove their Supabase `auth.getUser` checks in favor of the Nest result and explicit unauthenticated handling.

The alternative, fetching the Next.js route from server components through an absolute local URL, adds a network hop and origin/config handling. Direct server-to-Nest calls with forwarded cookies follow the existing API client boundary, while the browser stays on same-origin proxy routes.

### Make the creator transition idempotent

Keep the existing create form POST and field-error mapping. On success, clear transient form state and navigate to the invite route; that route loads the persisted invite server-side, so a refresh needs no browser storage. When no current invite exists or it has expired, render an unavailable/recovery state and allow the creator to continue to the dashboard without repeating creation. Remove the creator-only call to `/api/spaces/setup/complete` from the invite continuation; the owner membership is already completed in the creation transaction. The join flow and its legacy completion behavior remain outside this change.

Do not reuse the hard-coded `INVITE_CODE` example as a creator invite or join-input placeholder; remove it so the UI does not suggest a usable code that may not exist. Normalize the optional owner name in Nest so an empty or invalid account name uses the existing `Leonly User` contract.

### Bound the dashboard experience to migrated data

The active-space shell and one-member waiting state can render from the Nest read. A newly created Nest space has no persisted memories in the migrated data model. Avoid calling Supabase-only recent-memory or invite-regeneration paths as if they were usable for that space: present the truthful new-space empty state and keep unsupported actions out of this bounded entry experience until their own capabilities migrate. Keep existing Supabase-backed feature paths available for legacy users rather than silently reporting an upstream failure as an empty result. Verify the newly created space route in a real Better Auth session and document any still-visible legacy-only actions before marking implementation complete.

## Risks / Trade-offs

- **Shared lookup has legacy callers** → Inventory usages in setup, dashboard, and memory loaders before replacing its backing service; keep the change scoped to the new-space journey and test routing on both sides of the membership boundary.
- **False absence after an API error** → Distinguish `data: null` from an authentication, transport, or parsing error; never redirect an existing member into creation because Nest is unavailable.
- **Invite expiry between render and copy** → Check the persisted expiry on the invite view, do not label an expired code usable, and permit dashboard continuation.
- **Existing dashboard widgets still rely on Supabase** → Gate or replace only those widgets needed for the new-space dashboard's truthful empty/waiting state; do not invent memory records or claim the unmigrated features are functional.

## Migration Plan

1. Add the active-space GET and focused API tests for membership, isolation, nullable invite, missing session, and query failures.
2. Switch the Next proxy and request-scoped server lookup, then the create/invite and dashboard-entry routes; adjust focused web tests.
3. Remove the creator completion RPC dependency and verify the persisted invite and dashboard waiting/empty states after a browser reload.
4. Run OpenSpec validation and API/web-app checks. Deploy API read before web callers; if necessary, roll back the web callers while leaving the additive API route in place.
