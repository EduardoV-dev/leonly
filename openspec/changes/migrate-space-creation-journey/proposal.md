## Why

The create-space form already posts to Nest, but the invite page and dashboard still resolve membership through Supabase. A space created for a Better Auth user cannot reliably be read by those legacy paths, so a successful POST does not complete onboarding.

## What Changes

- Add a session-authenticated Nest read for the current user's active space, including the persisted invite and the data needed by the dashboard shell.
- Use the same Better Auth identity for create-page guards, the invite interstitial, and dashboard entry. Show and copy the real invite after a refresh.
- Remove the Supabase setup-completion call from the creator's invite continuation: Nest already completes the owner membership when it creates the space.
- Keep unsuccessful creation recoverable: preserve form state, display validation or conflict feedback, and do not route to the invite page.
- Reconcile the optional creator-name fallback between the Nest creation path and the space-lifecycle contract.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `api-endpoints`: Define a session-authenticated active-space read for the current user, with a response suitable for the invite and dashboard entry paths.
- `space-lifecycle`: Require the creator's invite and membership-aware routing to use persisted state under the Better Auth identity, including refresh and failure behavior.

## Impact

- Nest spaces controller/service and their tests; Next.js API proxy and server-side active-space lookup.
- Create-space pages and guards, invite continuation, application layout, dashboard entry, and focused web-app tests.
- No new dependency or database schema change is expected. Join, settings, and memory operations remain separate migration work unless one blocks the new-space dashboard entry.
