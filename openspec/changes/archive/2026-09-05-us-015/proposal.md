## Why

Members currently have no single place to understand the active shared space, its membership, or
which settings belong to the couple versus the individual. US-015 establishes that trusted settings
surface before the dependent invite and editing stories add mutations to it.

## What Changes

- Add a Settings destination inside the authenticated application shell for the current active
  space.
- Present shared-space identity, date-only start date, membership count and status, active members,
  and safe fallbacks for optional avatars and invite data.
- Distinguish shared settings from the current member's personal settings and reserve clear extension
  regions for invite, space-name, start-date, display-name, and language actions delivered by later
  stories.
- Show privacy-limited account context consisting of the authenticated email and sign-in provider
  when available, plus a separate sign-out action.
- Link to the existing Private Vault and accurately explain that it is shared by both active members
  while remaining outside the public Timeline.
- Cover loading, failed reads, no-active-space redirects, generic not-found outcomes, responsive
  layouts, keyboard interaction, focus visibility, and status cues that do not rely on color alone.
- Apply the supplied settings reference as compositional inspiration while preserving Leonly's
  established typography, warm palette, dashboard shell, and mobile navigation.

## Capabilities

### New Capabilities

- `shared-space-settings`: Read-only presentation and access behavior for the active shared space,
  membership, member-owned settings, account context, Private Vault navigation, and future settings
  action regions.

### Modified Capabilities

None.

## Impact

- Adds a settings route, loading and error boundaries, page-level components, styles, translations,
  and tests in `apps/web-app`.
- Extends the existing dashboard shell navigation and active-section model with Settings.
- Adds a server-only settings read model derived from the authenticated session and active
  membership, backed by existing Supabase tables/RLS or a narrowly scoped read RPC if required.
- Reuses the existing active-space, member-avatar, Private Vault, authentication, and responsive shell
  patterns without adding a new runtime dependency.
