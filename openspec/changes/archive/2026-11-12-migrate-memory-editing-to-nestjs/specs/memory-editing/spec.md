## RENAMED Requirements

- FROM: `### Requirement: Optimistic concurrency and idempotent submission`
- TO: `### Requirement: Optimistic concurrency and uncertain save recovery`

## MODIFIED Requirements

### Requirement: Authorized detail-only edit access

Either active-space member SHALL access `/memories/[memoryId]/edit` from an Edit link on authorized
Timeline or Vault detail. Summary surfaces MUST NOT expose Edit. Editor reads and writes MUST derive
access from the current session and active space, use only current-backend data, and treat malformed,
missing, inactive, deleted, cross-space, and inaccessible targets as the same generic not-found outcome.

#### Scenario: Member views detail
- **WHEN** a member opens an authorized Timeline or Vault detail page
- **THEN** an accessible Edit link opens that memory's server-authorized editor

#### Scenario: Active member edits from a timeline detail
- **WHEN** either active member activates Edit on Timeline detail
- **THEN** `/memories/[memoryId]/edit` loads the authorized memory without changing placement

#### Scenario: Active member edits from a Vault detail
- **WHEN** either active member activates Edit on Vault detail
- **THEN** the same editor route loads the authorized Vault memory without making it Timeline-visible

#### Scenario: Summary surfaces do not expose Edit
- **WHEN** a member views Timeline, Vault, dashboard, recent-memory, or related-memory summaries
- **THEN** those surfaces provide no Edit action

#### Scenario: Detail action adapts beside attribution
- **WHEN** a member views authorized detail across supported widths
- **THEN** Edit remains keyboard accessible beside established attribution/actions without obscuring them

#### Scenario: Member addresses an unavailable edit route
- **WHEN** the editor targets a malformed, missing, inactive, deleted, other-space, or inaccessible memory
- **THEN** the same generic not-found outcome exposes no record or storage state

### Requirement: Prefilled editable memory state

The shared form SHALL prefill title, description, date, location, placement, complete ordered photos,
cover, and the exact current update timestamp from the current backend. Creation-editable controls
SHALL remain editable. Ready previews SHALL use authorized 300-second signed GET URLs, subject to
earlier credential expiry; missing variants SHALL be nullable. Creator, creation time, comments, and
reactions MUST NOT be editable.

#### Scenario: Memory has complete editable data
- **WHEN** an authorized member opens a memory with metadata, photos, and a cover
- **THEN** values are prefilled, photos follow persisted order rather than cover-first detail order, and the current cover is selected

#### Scenario: Memory has no optional values or photos
- **WHEN** an authorized member opens a memory without description, location, photos, or cover
- **THEN** optional fields and photo selection are empty without fabricated content

#### Scenario: Retained variant is unavailable
- **WHEN** an attached photo has no ready preview variant
- **THEN** its identity remains in the editable selection with an accessible fallback and can be retained or removed

#### Scenario: Preview access changes after issuance
- **WHEN** a photo is removed or access is revoked after its preview URL was issued
- **THEN** fresh authorized reads no longer issue that URL, while the prior URL can work until effective expiry

### Requirement: Retained and replacement photo editing

The editor SHALL allow retaining any current photos, removing any or all current photos, and adding
JPEG, PNG, or WebP uploads under creation's file limits, including the 5 MB limit and asynchronous
binary verification. At most ten retained and added photos SHALL remain after Save. Retained photos
MUST keep their existing identities, objects, ready variants, and persisted relative order without
rewriting or reprocessing. New photos SHALL follow retained photos in file-selection order. Manual
reordering is not provided.

The retained selection SHALL determine removals independently of additions. An added photo MUST NOT
implicitly remove an existing photo. With a nonempty final selection, exactly one retained or added
photo MUST be cover; with no photos, cover MUST be null. New uploads MUST be eligible same-space,
requester-owned unattached originals. Either member MAY retain the partner's photos already attached
to the authorized memory. Duplicate, overlapping, foreign, or invalid references MUST be rejected.

#### Scenario: Member retains and adds photos
- **WHEN** a valid edit retains A and C from A/B/C, removes B, and adds D
- **THEN** Save commits the ordered selection A/C/D, A and C remain normally usable, and D alone may display a processing fallback
- **AND** B is removed at commit without waiting for D and there is no delayed replacement mapping

#### Scenario: Member only adds a photo
- **WHEN** an edit retains every current photo and adds a new photo within the limit
- **THEN** all current photos remain attached and usable while only the new photo requires processing

#### Scenario: Member removes every photo
- **WHEN** an edit retains no current photo and adds no new photo
- **THEN** the committed memory has no photo associations or cover and affected views use their accessible fallback

#### Scenario: Photo edit is invalid
- **WHEN** a request exceeds ten final photos, duplicates references, includes an ineligible upload or foreign retained ID, or selects an invalid cover
- **THEN** validation rejects the edit without changing existing photos, cover, or metadata

#### Scenario: Another member uploaded a retained photo
- **WHEN** either active member retains an existing photo uploaded by the partner
- **THEN** retention is authorized by attachment to the available memory rather than new-upload ownership rules

### Requirement: Atomic edit and private-media cleanup

Save SHALL atomically commit normalized metadata, placement, final photo associations/order, cover,
explicit removals, and new-photo outbox events using existing persistence models. Save MUST NOT wait
for new image variants to be ready. A failure before commit MUST preserve the prior memory and photo
associations. A committed save SHALL remain committed even if queue publication or image processing
later fails. Removed photos SHALL disappear from fresh product reads at commit, even while additions
are processing; their original/derivative families SHALL be marked `deleting` with attribution kept
for deferred physical cleanup. Previously issued signed URLs retain their effective expiry.

#### Scenario: Complete edit commits
- **WHEN** upload confirmation, edit validation, and the version-checked transaction succeed
- **THEN** metadata, final associations, cover, removals, and outbox events commit together and Save can report success before new variants are ready

#### Scenario: Edit fails after replacement upload begins
- **WHEN** upload confirmation, validation, or persistence fails before commit
- **THEN** the prior memory and photos remain current and unconsumed uploads remain private and attributed without a physical-cleanup promise

#### Scenario: Successful edit removes an old photo
- **WHEN** Save commits without retaining an existing photo
- **THEN** fresh reads omit it immediately, issue no new URL for it, and continue serving retained photos regardless of new-photo readiness

#### Scenario: Failed save transaction rolls back
- **WHEN** persistence fails after some transaction writes have run
- **THEN** metadata, timestamp, photo associations, cover, removal state, and events roll back together

#### Scenario: Added image fails after Save
- **WHEN** the committed new photo fails binary verification or exhausts processing retries
- **THEN** the new photo has an unavailable fallback, saved metadata and retained photos stay intact, and explicitly removed photos are not restored

### Requirement: Optimistic concurrency and uncertain save recovery

The editor SHALL submit exact `lastKnownUpdatedAt` from its snapshot. The save SHALL atomically match
memory identity, authorized active-space availability, and that timestamp, strictly advancing the
persisted token on success. No edit-attempt model, durable reservation model, edit idempotency key,
request hash, stored historical result, or operation-status/finalization API SHALL be introduced.
Creation's existing idempotency contract MUST remain unchanged.

A repeated request using a previously committed timestamp MUST NOT commit again, but MUST NOT be
promised the original successful response. Stale eligible requests SHALL return conflict requiring
reload. Lost responses, timeouts, or aborts MUST be treated as uncertain: offer a current authorized
reload before another deliberate save, without silently rebasing, automatically resubmitting, or
claiming that a changed timestamp proves which edit committed.

#### Scenario: Two members edit the same version
- **WHEN** one edit commits before another based on the same prior timestamp
- **THEN** the later request changes nothing and reports conflict requiring reload

#### Scenario: Edit overlaps another lifecycle mutation
- **WHEN** a move, restore, or edit advances the timestamp before Save, or deletion makes the target unavailable
- **THEN** Save changes nothing and returns conflict or generic unavailable respectively

#### Scenario: Same edit request is repeated
- **WHEN** the same edit is repeated with the timestamp consumed by its first committed save
- **THEN** no second edit commits and the repeat receives conflict rather than a replayed historical result

#### Scenario: Save response is lost
- **WHEN** the client cannot determine whether Save committed
- **THEN** it offers reload, blocks blind repeat saves, and does not announce success or rollback without evidence

#### Scenario: Member reloads after an uncertain response
- **WHEN** the member chooses reload after an uncertain save
- **THEN** authorization and current state are loaded again and another edit requires a deliberate submission using that displayed snapshot

#### Scenario: Access is revoked before recovery
- **WHEN** the member loses access or the parent is deleted before reload
- **THEN** generic unavailable clears inaccessible state without disclosing a historical operation result

### Requirement: Editor feedback, navigation, and affected-view refresh

The editor SHALL provide accessible loading, validation, single-flight upload/save, recoverable
pre-commit failure, uncertain-response reload, conflict-reload, and unavailable states. Conflicting
controls SHALL be disabled during upload/save and unresolved uncertain outcomes. Cancel before
submission SHALL leave memory data unchanged and return to initial-placement detail. A confirmed
save SHALL toast and navigate to final-placement detail without waiting for image readiness. There
SHALL be no edit-status polling budget, resume action, or second finalization request.

Affected list caches SHALL restart from page one and dashboard/detail/related reads SHALL refresh
after commit. Ready retained photos MUST render independently of pending or failed additions. Later
authorized refreshes can return newly ready variants; realtime updates or image-readiness polling
are not required.

#### Scenario: Member cancels an edit
- **WHEN** a member cancels before submission from a Timeline or Vault memory
- **THEN** no edit is submitted and navigation returns to initial-placement detail

#### Scenario: Placement changes on save
- **WHEN** Save commits a different final placement while some new variants are pending
- **THEN** a localized accessible save-success toast and final-placement navigation occur immediately without a persistent success query parameter
- **AND** affected lists restart from page one and current reads reflect saved state with per-photo fallbacks

#### Scenario: Member activates save repeatedly
- **WHEN** Save is activated again while uploads or the save response are pending
- **THEN** only one request flow runs, conflicting controls are disabled, and pending feedback is accessible

#### Scenario: Recoverable edit failure occurs
- **WHEN** a definite pre-commit recoverable failure confirms that no edit committed
- **THEN** values and local files are preserved and retry may reuse the observed timestamp and still-eligible uploaded identities

#### Scenario: Processing outlasts the save response
- **WHEN** new variants remain pending after Save commits
- **THEN** the editor does not poll or wait for finalization and retained photos stay usable beside new-photo fallbacks
