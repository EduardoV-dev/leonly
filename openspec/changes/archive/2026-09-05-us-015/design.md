## Context

See `proposal.md` for motivation and `specs/shared-space-settings/spec.md` for the behavioral contract.
The authenticated application layout already redirects users without an active membership to setup,
and the dashboard route group supplies the persistent desktop sidebar and mobile navigation. Settings
is currently a disabled shell item. The existing `get_active_space` RPC is membership-derived and
returns space summary data, but it omits stable member identity, membership join dates, a current-member
marker, and account context required by this view.

The database permits at most one active membership per user and one active owner and partner per
space. Direct table RLS intentionally limits profile and membership reads, while the existing
security-definer active-space RPC exposes a narrow shared projection. The implementation must retain
that privacy boundary and keep date-only values timezone-neutral.

## Goals / Non-Goals

**Goals:**

- Build a server-first Settings route inside the existing dashboard shell with a purpose-built,
  typed read model.
- Make current-member identity and one-member/two-member state explicit rather than deriving them from
  array order, role labels, or display-name equality.
- Establish section and component boundaries that dependent settings stories can extend without
  redesigning the page.
- Match the supplied composition's calm hierarchy, summary rail, and grouped value rows while using
  Leonly's existing Fraunces/Nunito Sans typography, warm tokens, navigation, and accessibility rules.

**Non-Goals:**

- Editing the space name, start date, display name, or language.
- Copying or regenerating invite codes; US-024 owns those interactions.
- Changing avatars, authentication identity, credentials, or account lifecycle.
- Showing Private Vault entries, counts, synchronization claims, encryption claims, app versions, or
  real-time presence not backed by current product behavior.
- Adding a direct `/settings/[spaceId]` route or accepting client-selected space/member identifiers.

## Decisions

### Use one server-only settings read model

Add a settings feature server module that loads the authenticated user and a narrow active-space
settings projection in the server-rendered route. The domain result will include shared values,
invite availability, active members with stable IDs and join dates, the current membership ID, and
privacy-limited account context. The page receives this typed model rather than combining unrelated
queries in client components.

This keeps authorization and data shaping at the trust boundary, prevents client waterfalls, and
makes mutually exclusive no-space/success states explicit. Reusing `ActiveSpace` directly was
rejected because extending a dashboard-oriented model with account-only data would broaden every
consumer and still leave current-member identity ambiguous.

### Add a narrowly scoped `get_active_space_settings` RPC

Create a migration with a `security definer` SQL function that derives `auth.uid()`, uses an empty
`search_path` with schema-qualified names, and returns only the active space and active membership
fields needed by Settings. It will include member ID, display name, avatar URL, membership
creation date, role, and whether the row belongs to the caller. It will return `null` when no active
space is available and will never accept a space ID.

Changing the existing `get_active_space` response was rejected because it is shared by the dashboard
and would increase its payload and regression surface. Direct client-side table joins were rejected
because current RLS correctly prevents members from reading another user's profile and because a
settings projection is easier to audit than broader policies.

### Read account context from the verified auth user

Use the server Supabase client's verified `auth.getUser()` result for the current account email and
the primary provider identifier in `app_metadata.provider`. Normalize the provider through a small
allowlist for presentation; unknown or missing values become an unavailable label. Never pass the
auth user object, identities array, provider payload, user ID, tokens, or metadata to the client.

Using `public.users` for account context was rejected because it does not store provider information
and its synchronized email is secondary to the verified auth identity. The UI will not infer a
provider from avatar URLs or email domains.

### Keep the page server-rendered and isolate sign-out

The route page loads the settings model on the server and passes only the narrow safe projection to a
client presentation boundary so existing device-local translations can update immediately. Sign-out
uses a small form backed by a Server Action that invokes local-scope Supabase sign-out and redirects
to `APP_ROUTES.AUTH`. The control stays separate from shared and personal setting rows.

A client query for the whole page was rejected because the view has no live edits in US-015 and a
server render provides simpler access control, less JavaScript, and no protected-data cache to clear.

### Extend the existing dashboard shell explicitly

Add `APP_ROUTES.SETTINGS`, include `settings` in the shell's active-section type, enable both Settings
navigation links, and resolve `/settings` explicitly before the Timeline fallback. Place the route
under the existing `(application)/(dashboard)` groups so authentication, no-space redirects, desktop
sidebar, mobile header, and bottom navigation remain consistent.

The active-section string union should be defined once and shared by the shell and its two navigation
components. Introducing a new global navigation framework was rejected as unnecessary.

### Compose the view as editorial sections, not functional placeholders

Use a mobile-first single column that becomes an asymmetric two-column editorial layout at desktop:
a compact space summary and Private Vault callout in the supporting rail, with Shared Space, Members,
Your Preferences, and Account sections in the primary column. Preserve logical source order so the
same hierarchy reads correctly when stacked.

Value rows reserve a trailing action region through their layout API, but US-015 renders no fake edit,
language, copy, or regenerate controls. One-member invite status is visible as text with an extension
region; two-member state replaces it with joined status. Existing cards, tokens, icon conventions,
avatar fallback, and focus styling are reused before introducing page-local styles.

### Use route boundaries for asynchronous states

Add a route-level `loading.tsx` with labelled skeleton structure and an `error.tsx` client boundary
with a generic message and retry action. The application layout continues to own unauthenticated and
no-active-membership redirects. The Settings RPC returning no result after the layout check is treated
as a no-space race and redirects to setup; unexpected query failures throw after redacted server
logging so the error boundary handles them.

## Risks / Trade-offs

- [Layout and page reads can observe membership at different instants] -> Treat a null settings result
  as loss of active membership and redirect to setup rather than rendering stale or partial data.
- [A security-definer RPC can bypass RLS] -> Accept no resource identifier, derive `auth.uid()`,
  schema-qualify every relation and function, revoke public/anonymous execution, grant only to
  authenticated, and cover the no-argument authorization contract through the web test suite.
- [Provider metadata varies across OAuth providers] -> Allowlist presentation labels and render a
  neutral fallback; never expose raw metadata.
- [The inspiration contains unsupported claims and actions] -> Reuse only composition and hierarchy;
  omit presence, encryption, synchronization, version, and future edit controls unless backed by a
  delivered story.
- [Many page sections can create oversized components] -> Keep one component per production file and
  collocate page-only sections and styles under a dedicated settings feature page.

## Migration Plan

1. Deploy the additive settings RPC and grants, and verify its contract through focused web server
   module tests with mocked Supabase boundaries plus migration review; the repository does not add
   database integration suites.
2. Deploy the typed server read model, Settings route and boundaries, shell navigation updates,
   translations, presentation components, and behavior tests.
3. Verify one-member, two-member, missing optional data, no-space, failed-read, responsive, keyboard,
   and cross-user access scenarios before enabling dependent settings stories.

Rollback removes the application route/navigation entry first, then drops the additive RPC in a
follow-up migration after confirming no deployed consumer remains. Existing dashboard behavior and
data remain unchanged throughout.
