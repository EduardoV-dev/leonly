## 1. Shared contract and API

- [x] 1.1 Add shared detail, nullable photo-variant, and bounded related-summary contracts; omit social fields and mutation versions.
- [x] 1.2 Add Timeline and Vault detail endpoints and a shared service, deriving active membership from the authenticated session and applying active-space, deletion, and fixed-visibility constraints to parent and related reads.
- [x] 1.3 Preserve the same generic 404 for malformed, absent, deleted, wrong-visibility, and unauthorized IDs; distinguish unauthenticated and unexpected failures.
- [x] 1.4 Read creator attribution and position-ordered attachments, move the cover first, and sign authorized ready cover/detail variants and related covers for 300 seconds; return null for unavailable variants.
- [x] 1.5 Bound and deterministically order related memories, exclude the parent, and omit social counts; register the service and document both operations and URL limitations in OpenAPI.

## 2. Frontend cutover

- [x] 2.1 Replace both detail and related Supabase readers with the new detail response; forward the incoming session cookie explicitly and retain request-scoped deduplication for metadata and rendering.
- [x] 2.2 Preserve contextual routes, metadata, generic not-found, loading, retry, and private response behavior; handle backend failures separately from unavailable results.
- [x] 2.3 Update the gallery for independently nullable variant URLs, cover-first order, detail-to-cover fallback, accessible unavailable state, and empty photos.
- [x] 2.4 Render related cards with authorized new-backend summaries and correct visibility links without fabricated social counts.
- [x] 2.5 Stop mounting comments, reactions, edit, delete, and placement controls on both pages; ensure they create no associated background requests or empty placeholders.
- [x] 2.6 Retain legacy availability, image, edit, mutation, and social code still used by non-migrated consumers; do not add a legacy fallback or import.

## 3. Verification and delivery

- [x] 3.1 Add API-owned tests for both visibilities, generic unavailable cases, session and membership boundaries, creator attribution, relation filtering, ordering, variant states, and signing failures.
- [x] 3.2 Add frontend tests for explicit cookie forwarding, metadata/page response handling, gallery fallback and navigation, related links, and absence of unsupported controls and requests on both detail pages.
- [x] 3.3 Run backend check, typecheck, test, and build gates sequentially; run web check, typecheck, test, and build gates.
- [x] 3.4 Verify newly created Timeline and Vault memories end-to-end, fresh signed URL issuance, revoked access, processing variants, loading/retry, and contextual navigation; deploy API before frontend.
