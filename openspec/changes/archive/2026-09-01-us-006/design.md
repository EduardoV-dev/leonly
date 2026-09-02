## Context

See `proposal.md` for motivation and `specs/private-vault/spec.md` for observable behavior. The current
app already has active-space RLS, `timeline` and `vault` visibility, generic available-memory lookup,
private signed-cover delivery, a deterministic timeline cursor, memory summary cards, TanStack Query
infinite loading, and a responsive dashboard shell. Vault navigation is present but disabled.

US-006 crosses route, query, navigation, feedback-state, and presentation boundaries. It must reuse
those established contracts without turning the shared Vault into a member-to-member privacy boundary
or implementing later mutations.

## Goals / Non-Goals

**Goals:**

- Add one authorized, paginated Vault read path with deterministic chronology.
- Keep timeline and Vault list contracts behaviorally aligned where their requirements match.
- Reuse existing private-media and memory-detail authorization boundaries.
- Give the Vault a distinct but native Leonly presentation across desktop and mobile.
- Leave stable action/count composition points for later stories.

**Non-Goals:**

- Edit, move, restore, or delete mutations from US-007 through US-009 and US-014.
- Member-specific secrecy, encryption, access roles, or a second authorization model.
- Search, filters, arbitrary sorting, realtime partner updates, or moved-to-Vault audit history.
- New global design tokens, fonts, navigation patterns, or runtime dependencies.

## Decisions

### Order by the memory's chronology

Vault pages use `memory_date DESC`, then `created_at DESC`, then immutable UUID `DESC`.

This preserves the product's core mental model: a hidden memory remains part of the couple's story even
when it leaves the public timeline view. It also aligns timeline and Vault ordering, supports direct
Vault creation, and requires no new lifecycle timestamp.

Alternatives considered:

- Creation time makes recently entered old memories appear newest, which weakens chronological recall.
- Time moved to Vault would turn the page into an activity feed and requires a new authoritative
  transition timestamp plus backfill semantics before US-008 exists.

### Mirror the timeline's 20-item keyset cursor

Each page contains at most 20 items. The opaque Base64URL JSON v1 cursor contains exactly
`memoryDate`, `createdAt`, and `id`, and the next query applies strict lexicographic "after" predicates
for the descending tuple.

Using the same shape and size as the timeline lowers cognitive and implementation risk, stays well
within signed-cover request costs, and gives stable pagination without offset drift. Twenty cards are
enough to make each request useful without producing an oversized mobile render or signed-URL burst.

Alternatives considered:

- Offset pagination can duplicate or skip rows when visibility changes between requests.
- A memory-date-only cursor is not total when dates repeat.
- A different page size has no demonstrated Vault-specific benefit and creates unnecessary divergence.

### Reset invalid and stale cursors without enumeration

Cursor parsing uses a strict schema that rejects unsupported versions, extra properties, missing
properties, and malformed tuple values. Before applying a valid cursor, the server confirms that the
full tuple still identifies an active Vault memory in the current active space. Invalid or stale input
returns page one with `cursorReset: true`.

This matches timeline recovery, prevents a restored or deleted anchor from producing confusing gaps,
and avoids revealing why an anchor is unavailable. A reset response replaces previously accumulated
pages instead of appending duplicate first-page results.

### Add a feature-owned Vault list boundary

The Vault gets its own route, API read, query key, server resolver, page model, and page-level UI. It
may share narrowly reusable cursor and memory-summary transformations with the timeline when extraction
reduces real duplication, but it must keep Vault eligibility and error language explicit.

This prevents a client-supplied visibility value from becoming an authorization or arbitrary-query
control. The server owns the fixed `visibility = 'vault'` predicate.

Alternatives considered:

- A generic endpoint accepting `visibility` broadens the trust boundary for only two fixed products.
- Copying every timeline helper is locally simple but makes cursor validation and recovery prone to
  drift; extraction is justified only for behavior that is truly identical.

### Resolve covers after parent-memory eligibility

The Vault query returns only summary fields and resolves each cover through the existing authorized
private-media contract. Object paths never cross into the browser. Individual cover-signing failure
degrades to the existing accessible fallback rather than failing the whole page.

### Treat the Vault as a shared archive, not a security console

The page extends Leonly's warm editorial language with a quiet archival character: blush paper
surfaces, restrained lavender categorization, burgundy actions, Fraunces headings, framed photography,
and a lock motif used as context rather than alarm. A compact hero explicitly says the Vault is shared
by both active members. Memories remain the dominant visual content.

Desktop uses the existing sidebar and a spacious content column. Mobile uses the existing compact
header and safe-area-aware bottom navigation. Cards may use a dedicated `vault` presentation variant,
but retain the summary link and sibling extension regions. Loading skeletons preserve final geometry;
empty and error states occupy the content region without replacing navigation.

### Keep later actions absent but composable

US-006 renders no disabled edit, restore, or delete controls. Stable sibling extension regions remain
available on each card for later capabilities, avoiding misleading affordances while preserving the
planned composition boundary.

## Risks / Trade-offs

- [Moving a memory into the Vault does not place it first] -> Explain and test chronological ordering;
  moved-at ordering can only be introduced later with an explicit product and schema change.
- [Signing up to 20 covers can increase read latency] -> Resolve concurrently, retain the established
  short TTL/cache behavior, and degrade individual failures to fallbacks.
- [Shared cursor extraction could disturb the completed timeline] -> Keep extraction narrow and retain
  timeline regression tests for ordering, stale recovery, and response shape.
- [A lock motif can imply partner secrecy] -> Pair it with persistent shared-access copy and avoid
  language such as personal, secret, or only you.
- [Later actions may crowd cards on mobile] -> Keep action regions outside the summary link and reserve
  a compact overflow/action-row layout without rendering controls in US-006.

## Migration Plan

1. Add the fixed Vault query/index support needed for the specified eligibility and ordering if the
   existing memory index does not already cover it.
2. Deploy the server resolver and read-only API before enabling navigation.
3. Deploy the Vault page and enable desktop/mobile destinations together.
4. Verify existing direct Vault detail access and timeline exclusion remain unchanged.
5. Roll back by disabling/removing the navigation destination and read route; no stored memory data or
   visibility values require migration reversal.

## UI Design Prompt

The reusable implementation prompt is in `ui-prompt.md` so it can be supplied directly to a UI design
or coding agent without the surrounding architecture discussion.
