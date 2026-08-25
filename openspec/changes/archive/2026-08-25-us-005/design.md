## Context

The repository already has active-space RLS, `get_available_memory(uuid)` as the generic authorization
lookup, ordered `memory_photos` metadata, private Storage reads, server-only cover signing, timeline cards
with a reserved detail-link region, and a minimal `/memories/[memoryId]` server route. US-005 must expand
that read path across Postgres, Storage, server rendering, and an interactive gallery without exposing object
paths or collapsing failed reads into privacy-sensitive not-found behavior.

## Goals / Non-Goals

**Goals:**

- Reuse the existing available-memory boundary rather than create a competing authorization model.
- Return one server-owned detail model containing complete metadata, current creator attribution, and ordered
  photo presentation data.
- Keep the page server-rendered while isolating only gallery selection and navigation in a client component.
- Make loading, not-found, and recoverable failures distinct and testable route outcomes.
- Preserve composition points for later memory actions, comments, and reactions without rendering fake
  controls now.

**Non-Goals:**

- Editing, deleting, moving, restoring, commenting, reacting, Vault browsing, photo reordering, image
  transformation, or realtime synchronization.
- A public memory-detail API, generalized media service, or new frontend dependency.

## Decisions

### Compose detail data behind the existing available-memory gate

The server detail resolver first validates the UUID and calls the existing available-memory lookup. A null
result remains the sole generic unavailable outcome. Only after that succeeds does it read the creator's
available membership and the memory's photo rows under existing RLS. Database or parsing failures after
authorization are propagated as recoverable read failures and logged at the server boundary.

This keeps `get_available_memory(uuid)` authoritative and avoids a second security-definer RPC. A new
all-in-one RPC was considered, but it would duplicate availability logic, increase migration and grant
surface, and return server-only storage metadata through a broadly executable database function.

### Sign all authorized photos only in the server resolver

The resolver orders photo metadata, then requests short-lived signed URLs from the private
`memory-photos` bucket. Its public return type contains photo IDs, presentation positions, signed URLs or a
null fallback state, and safe alternative text; it never returns `object_path`. Signing is bounded by the
existing maximum of 10 photos and can run concurrently after authorization to avoid a request waterfall.

A client endpoint that accepts photo paths was rejected because paths are not authority and would add an
avoidable browser trust boundary. Persisting signed URLs was rejected because they expire and are not
memory metadata.

### Promote the cover, then retain persisted order

The gallery order is the selected cover first, followed by every non-cover photo sorted by persisted
position ascending. This resolves the US-005 decision while preserving the US-004 selection order and
requiring no migration or new ordering column. The resolver performs this presentation transform without
mutating stored positions.

### Use a server page with one focused gallery client boundary

The route remains a thin async server component that resolves the detail model and maps null to `notFound()`.
The feature-owned detail page renders metadata and composition regions. A colocated client gallery owns only
the selected index and keyboard interactions; it receives the already authorized photo presentation model.
Single-photo and no-photo states remain server-renderable and do not need interaction state.

Making the entire page a client component was rejected because it would require a public fetch endpoint,
duplicate loading state, and send server-only concerns into the browser. A server-only gallery was rejected
because direct thumbnail selection and wrapping controls require local interaction state.

### Use route boundaries for loading, failure, and unavailable states

A colocated `loading.tsx` renders a detail-shaped skeleton. The server route uses `notFound()` only for the
generic null availability result. A colocated client `error.tsx` presents a localized retry control using the
route reset callback and does not retain prior detail content. Direct refresh naturally repeats authorization
and URL signing.

This is preferred to catching every error inside the page, which would blur not-found and infrastructure
failures and make retry behavior less consistent with Next.js route boundaries.

### Preserve editorial composition and independent interactive regions

The detail screen extends the existing warm editorial system: photography is the primary column, complete
story content is the reading column, and mobile source order keeps the hero photo before metadata. Fraunces,
Nunito Sans, blush surfaces, burgundy controls, warm borders, and the established responsive app shell are
reused. The gallery controls use semantic buttons and a radiogroup or tab-like direct selector whose selected
state and position are announced without color-only meaning.

The detail page accepts optional action, reaction, and comment content at named component boundaries. Empty
slots produce no landmark or placeholder UI. Visibility is passed to the action boundary so later stories
can choose move versus restore. This explicit composition is preferred to global registries or generic slot
frameworks, which would violate the repository's proportional YAGNI guidance.

The timeline card's primary non-action content becomes one large detail link while count and action regions
remain siblings outside that link. This avoids nested interactive elements when later controls arrive.

## Risks / Trade-offs

- [Up to 10 signing requests add server latency] -> authorize once, fetch ordered rows once, and sign the
  bounded set concurrently; keep per-photo fallback behavior so one signing failure does not erase the story.
- [Signed URLs can expire during a long-open detail session] -> image failure renders the accessible fallback;
  route retry or refresh issues current URLs without introducing background refresh complexity.
- [Memory state can change between authorization and dependent reads] -> every dependent table and Storage
  read remains protected by RLS; an inconsistent or denied dependent read fails closed.
- [A large linked card can conflict with future controls] -> keep the linked content and extension controls as
  sibling regions, never nest buttons or links.
- [Empty future regions could add accessibility noise] -> render no empty landmarks or disabled placeholders;
  semantic regions appear only when later capabilities provide content.

## Migration Plan

1. Add the feature-owned detail resolver and tests against current RLS and Storage behavior; no schema
   migration is expected.
2. Add the server detail page, focused gallery client boundary, responsive styles, localization, and route
   loading/error boundaries.
3. Activate the existing timeline detail-link extension without changing timeline queries or pagination.
4. Deploy as an additive read capability. Roll back the route UI and timeline links if needed; persisted
   memories, photos, and creation behavior remain unchanged.
