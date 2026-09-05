## Context

See `proposal.md` for motivation and the delta specs for behavior. The application already exposes
invite code and expiry through `get_active_space()` and `get_active_space_settings()`, formats the
stored lowercase eight-character code as `XXX-XXXXX`, and has an authenticated
`regenerate_space_invite()` RPC. The dashboard's current client component automatically regenerates
missing or expired invites, while Settings renders only a static status card. The regeneration RPC
already locks the derived space row and verifies one active member, but it has no rate limit or
distinct stale two-member result.

US-001 is the source of truth for role semantics: `owner` records creation history and grants no
additional authorization. Therefore any sole active member can manage the invite. Repository rules
also prohibit adding database integration suites, so database contracts are exercised through the web
test suite's RPC boundary and reviewed migration invariants.

## Goals / Non-Goals

**Goals:**

- Share one invite-status component and state model across Dashboard and Settings without coupling one
  page to the other's private styles.
- Keep eligibility, rate limiting, invite issuance, and stale-state handling atomic and server-owned.
- Preserve the existing code format and redemption compatibility while making clipboard behavior
  explicit and accessible.
- Make successful and stale regeneration outcomes visible immediately, then reconcile each page with
  authoritative server data.

**Non-Goals:**

- Changing invitation delivery, adding email or deep-link sharing, or introducing multiple concurrent
  invites.
- Changing the 24-hour lifetime, join-attempt rate limit, membership roles, or two-member capacity.
- Adding background polling or live subscriptions solely to detect a partner join.
- Reworking the broader dashboard or Settings information architecture.

## Decisions

### Use a feature-owned invite status component

Create a focused partner-invite feature containing the reusable client component, its interaction
hook, styles, types, and tests. Dashboard and Settings remain responsible for placement and pass the
server-derived code, expiry, and membership state. The component renders mutually exclusive valid,
unavailable, pending, rate-limited, failure, and joined presentations rather than exposing a set of
independent boolean props.

The valid presentation uses a labelled read-only text input for the uppercase formatted code. This
keeps the displayed value naturally keyboard-selectable. Copy writes the lowercase normalized value;
on Clipboard API absence or rejection, the component focuses and selects the input and announces the
manual-copy instruction. Successful regeneration updates local component state first and then calls
`router.refresh()` inside a transition to reconcile the server component without hiding the returned
code.

Alternative considered: maintain separate dashboard and Settings implementations. Rejected because
copy, expiry, focus, mutation, and feedback behavior would diverge across the two required surfaces.

### Keep expiry transitions local but regeneration explicit

The component evaluates expiry from the server-provided timestamp and schedules one timer for the
remaining duration. At the boundary it switches from valid to unavailable and offers the button; it
does not call the mutation automatically. Tests use controlled time to cover just-before and exact
expiry behavior.

Alternative considered: refresh or regenerate automatically at expiry. Rejected because US-024
requires an explicit regeneration action, automatic mutation consumes rate-limit capacity, and a
background request can race a partner join without user intent.

### Preserve the existing normalized invite contract

Keep the database representation as an approved lowercase three-letter prefix plus five characters
from `abcdefghjkmnpqrstuvwxyz23456789`. Keep `XXX-XXXXX` as presentation only. Centralize client
normalization/formatting tests around the existing space-setup validation module and retain equivalent
normalization in the database trust boundary: trim surrounding ASCII whitespace, lowercase, validate
the optional separator only after the prefix, then remove it for lookup.

Alternative considered: replace the friendly prefix scheme with a longer random token. Rejected
because it would break existing unexpired invites and expands US-024 beyond managing the established
US-001 lifecycle.

### Enforce regeneration and throttling in one database transaction

Add a per-user regeneration-attempt table following the existing join-attempt limiter's locked-row
pattern. The `security definer` RPC obtains or creates and locks that row, prunes timestamps outside the
rolling 10-minute window, and rejects the sixth request with a remaining `retry_after` before reading
membership or invite state. Requests during the lock do not add timestamps or extend `locked_until`.
Every request admitted past the limiter records its timestamp, including requests later found
ineligible, so callers cannot probe state without consuming capacity.

After admission, the RPC derives the active space from `auth.uid()`, locks the space row, and counts
active memberships while holding the authoritative row lock. It returns:

- `regenerated` with the new normalized code and expiry after atomically replacing a missing or
  expired code;
- `joined` when the caller still belongs to a now-two-member active space;
- `unavailable` for missing or inaccessible membership/space and for an already-valid invite;
- `locked` with remaining whole seconds when throttled.

The route maps `unavailable` to the existing generic `404`, `joined` to a conflict-style stale result
that reveals no invite data, and `locked` to `429` with `Retry-After`. Authentication remains `401`.
Unexpected database and parse failures remain generic `500` responses and structured server logs.

Alternative considered: rate-limit in the Next.js process. Rejected because per-instance memory does
not survive restarts, coordinate deployments, or serialize concurrent requests.

### Reconcile stale membership through route outcomes and refresh

The UI disables regeneration while one request is pending. A `joined` response triggers an announced
status followed by `router.refresh()` so Dashboard removes the entire section and Settings renders its
joined state. A generic unavailable response also refreshes before retaining an actionable error,
allowing a stale valid-invite or inactive-membership page to converge without exposing protected data.
No automatic mutation retries are used, especially for `429`, because retries are user-visible,
state-changing requests and each admitted request consumes rate-limit capacity.

Alternative considered: optimistic section removal on any conflict. Rejected because a still-valid
invite and a partner join require different final presentations; authoritative refresh resolves that
distinction.

### Extend existing reads without accepting resource identifiers

Keep both page reads membership-derived. Their schemas continue to expose code and expiry only for a
one-member space. The Settings read model keeps its explicit one-member/two-member discriminator; the
dashboard derives the same state from active members. No space ID is sent by the browser during
regeneration.

Alternative considered: add a generic invite-status HTTP read endpoint. Rejected because both server
rendered pages already obtain the required data securely and another request would add a waterfall.

## Risks / Trade-offs

- [A user can consume the limit through repeated stale requests] -> Disable pending controls, never
  auto-retry mutations, show the exact retry response, and retain the 10-minute bounded recovery.
- [Client and database normalization can drift] -> Keep one explicit contract in the spec and add
  boundary tests for formatted, unformatted, mixed-case, excluded-character, and whitespace inputs.
- [A partner can join between render and mutation] -> Re-check membership under the space lock and
  return no invite data from stale outcomes.
- [Local success state can briefly differ from refreshed server state] -> Keep the mutation response
  visible while refreshing and let the authoritative result replace it when reconciliation completes.
- [The shared component may inherit incompatible page spacing] -> Own visual treatment inside the
  partner-invite feature and expose only a small semantic surface variant if composition requires it;
  each page owns outer placement.
- [The finite friendly-code space has less entropy than opaque tokens] -> Preserve the existing
  contract for compatibility, uniqueness, short lifetime, server-side redemption limiting, and atomic
  collision retries; changing entropy belongs to a separate lifecycle migration.

## Migration Plan

1. Add the regeneration-attempt table, constraints, access revocations, and the revised transactional
   RPC in a forward Supabase migration. Existing spaces and invite codes require no data rewrite.
2. Deploy the route's expanded result parsing and HTTP mappings with the shared component and both page
   integrations in the same application release.
3. Verify existing valid and expired invites, one-member and two-member reads, prior-code invalidation,
   stale races, throttling headers, clipboard fallback, and both responsive placements through focused
   web tests and the normal CI gates.
4. Roll back the application before the database migration if needed; the expanded RPC result remains
   compatible with the old happy-path response. If database rollback is required, restore the prior
   RPC definition and remove the limiter table only after confirming no newer application instance is
   active.
