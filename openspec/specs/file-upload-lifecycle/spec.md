# file-upload-lifecycle Specification

## Purpose
Track authorized uploads as immutable, attributed file records; confirm object presence and preserve retry ownership while content validation and optional image generation proceed asynchronously.

## Requirements

### Requirement: Purpose-scoped upload issuance

The system SHALL expose `POST /api/files/uploads` for batch issuance and persist an original `files` row before returning each capability. It MUST derive uploader and space from authentication, control bucket/key selection, and preserve existing JPEG/PNG/WebP size/count limits. Initially only `memory_image` is accepted. No credential or unauthorized storage location SHALL be exposed.

#### Scenario: Member requests image uploads
- **WHEN** an authenticated active member requests valid memory-image descriptors
- **THEN** the system returns stable root file IDs, required headers, and presigned PUT URLs for server-selected immutable objects
- **AND** each capability has a durable file ownership record before it is returned

#### Scenario: Unsupported or unauthorized request
- **WHEN** a request uses an unsupported purpose, invalid descriptors, or unavailable membership
- **THEN** no unauthorized capability is issued and the standard validation or authorization failure is returned

### Requirement: Recoverable immutable original verification

FilesService SHALL confirm presence with HEAD and move pending files to uploaded without downloading or validating content. Workers MUST validate actual size, format, and full image decoding before readiness. Content validation MUST remain outside generic lifecycle operations. Upload capabilities MUST prevent overwrite; interrupted processing MUST recover using the same file identity and expiring operation ownership.

#### Scenario: Original is accepted
- **WHEN** the recorded object passes presence, size, binary-format, and decoding checks
- **THEN** the worker verifies a separate WebP replacement and makes the same file ID ready by swapping its stored-object reference

#### Scenario: Client attempts to replace an uploaded object
- **WHEN** a still-valid capability is reused after its key already exists
- **THEN** conditional storage authorization prevents overwriting the object
- **AND** the backend never relies on a mutable object as an accepted original

#### Scenario: Verification stops after object arrival
- **WHEN** the object exists but verification or database bookkeeping is interrupted
- **THEN** a later owned attempt can inspect that same object and finish without duplicating file records

#### Scenario: Original bytes are invalid
- **WHEN** content validation permanently rejects the uploaded bytes
- **THEN** the attached file becomes failed without exposing its bytes or removing the saved memory, and corrected bytes require a new upload identity

### Requirement: Unified originals and optional variants

Originals and derivatives SHALL use `files` with unique object keys and no bucket column. Storage MUST use the configured bucket without overrides or an approved-buckets setting. Derivatives MUST identify a same-space root and nonblank text `variant_name`; both fields MUST be populated together and their pair unique. Optional variants MUST NOT require separate tables or fixed attachment columns.

#### Scenario: Original has no derivatives
- **WHEN** an original has no generated variants
- **THEN** it remains a valid file without placeholder variant columns or mandatory derivative records

#### Scenario: A new variant is introduced
- **WHEN** an authorized operation requests a newly supported variant name
- **THEN** a derivative can be recorded without adding a database column or enum value

#### Scenario: Cross-space or duplicate derivative is attempted
- **WHEN** a derivative references another space's original or duplicates an original/variant pair
- **THEN** PostgreSQL rejects the conflicting relationship or duplicate identity

#### Scenario: File storage is accessed
- **WHEN** a recorded file is signed, read, verified, generated, or deleted
- **THEN** the operation uses its recorded object key in the application's configured storage bucket
- **AND** the file row does not persist a bucket

### Requirement: Creation-derived upload authorization expiry

Upload authorization SHALL expire at original creation plus the existing 600-second policy, using the same server-owned reference instant. The system MUST NOT persist upload or attachment expiry columns. Cleanup execution is deferred; authorization expiry MUST NOT trigger deletion. Derivative creation time MUST NOT establish a browser-upload deadline.

#### Scenario: Signing follows record creation
- **WHEN** a URL is signed after its file row is prepared
- **THEN** its authorization deadline remains tied to the original creation instant rather than receiving a renewed lifetime

#### Scenario: URL expired after object arrival
- **WHEN** an object arrived before URL expiry but confirmation is delayed
- **THEN** URL expiry alone does not mark it failed, expire a lifecycle state, or delete it

#### Scenario: Attached ready original passes its upload deadline
- **WHEN** the authorization deadline passes for a file retained by a memory attachment
- **THEN** the file is not selected for abandonment cleanup solely because of its age

### Requirement: File readiness is independent of execution and attachment

Files SHALL use generated `FileStatus`/`FilePurpose` maps for persisted values and purpose validation. The only states are `pending`, `uploaded`, `ready`, `failed`, and `deleting`. Uploaded means confirmed presence; ready means required verification succeeded. Failed MUST mean permanent failure or exhausted retries, not expiration or abandonment. Attachment and derivative progress MUST NOT downgrade a ready original.

#### Scenario: Browser reports upload success
- **WHEN** a browser reports success without server-side presence verification
- **THEN** that report alone does not establish uploaded or ready status

#### Scenario: Object is present but unverified
- **WHEN** the backend confirms presence before content checks finish
- **THEN** the file is uploaded and eligible for authorized attachment, but remains unavailable for serving

#### Scenario: Operation fails transiently
- **WHEN** a backend or worker operation encounters a retryable timeout before its retry budget is exhausted
- **THEN** it retains a recoverable lifecycle state and diagnostic error rather than claiming terminal failure

#### Scenario: Derivative generation fails
- **WHEN** one derivative permanently fails while its original is valid
- **THEN** the derivative can be failed while the original remains ready

### Requirement: Exclusive ready-file attachment

An original SHALL attach to at most one memory through `memory_files`. New attachment MUST require a same-space uploaded or ready original authorized for that uploader/purpose, respect operation ownership, and reject deleting files. Attachment and required generation events SHALL commit with the memory. A rollback MUST leave no partial association and MUST NOT consume or change the original's state.

#### Scenario: Two memories request the same original
- **WHEN** distinct creation requests race to attach one file
- **THEN** at most one association commits and the other receives a conflict or retryable outcome

#### Scenario: Creation transaction rolls back
- **WHEN** memory persistence fails after original presence confirmation
- **THEN** the original remains tracked and uploaded without a committed attachment or generation event from that transaction

### Requirement: Recoverable file operation ownership

Verification and generation SHALL coordinate using expiring operation-lock ownership independently of lifecycle status. Stale executions MUST NOT commit metadata for newer ownership or revive deleting files. Expired database ownership MUST NOT be treated as cancellation of in-flight storage operations. Cleanup execution is deferred.

#### Scenario: Execution crashes while holding a lock
- **WHEN** an operation stops before releasing its lock
- **THEN** another eligible operation can recover after expiry without a processing lifecycle state

#### Scenario: Stale worker completes after ownership changes
- **WHEN** an older execution attempts to record success after its lock expires or another execution claims ownership
- **THEN** its database mutation is rejected

### Requirement: Superseded source attribution is durable

The reference swap MUST atomically preserve the old key in a deleting `upload_source` row. Image-processing retries MUST retain access to that source. Automated source removal and cleanup-specific infrastructure are deferred; source attribution MUST remain available for future cleanup.

#### Scenario: Worker crashes after swapping the original
- **WHEN** the original reference swap commits before source removal
- **THEN** the old source remains attributed and available for image-processing retries and future cleanup

#### Scenario: Source upload capability remains valid
- **WHEN** the replacement is ready but the source authorization has not elapsed
- **THEN** the source and its attribution remain stored, so a reusable capability cannot recreate an untracked object

### Requirement: Cleanup is deferred without losing attribution

Cleanup execution and cleanup-specific infrastructure SHALL remain outside this delivery. Abandoned uploads and superseded sources MUST remain attributed in `files`; no automatic deletion, bucket lifecycle rule, cleanup schedule, or staging-deletion event is introduced. Upload authorization expiry MUST NOT itself trigger cleanup.

#### Scenario: Upload or source is abandoned
- **WHEN** upload issuance or image processing is not followed by completed memory use or source removal
- **THEN** the file record and object attribution remain available for a separately coordinated cleanup implementation

### Requirement: Edit uploads reuse exclusive attachment claims

New edit photos SHALL reuse issuance, immutable uploads, confirmation, expiring claims, and creation's
exclusive attachment protocol. Save MUST recheck same-space scope, requester ownership, purpose,
eligible unattached root state, and claim ownership in its transaction. No attempt/reservation model
SHALL be added. Retained photos SHALL use current-memory attachment authorization, not uploader ownership.

#### Scenario: Edit attaches its uploaded originals
- **WHEN** a valid version-matching edit saves confirmed uploads belonging to its requester
- **THEN** new associations and processing events commit with the edit without waiting for variants

#### Scenario: Another save claims the same upload
- **WHEN** creation/edit or edit/edit requests race to attach the same original
- **THEN** at most one attachment succeeds and the losing transaction cannot publish a partial edit

#### Scenario: Reference belongs to another member or memory
- **WHEN** new upload input identifies a foreign uploader, another space, an attached original, or an ineligible file
- **THEN** safe validation rejects it without exposing foreign state or changing the memory

#### Scenario: Attachment transaction rolls back
- **WHEN** the save transaction fails after new uploads were confirmed
- **THEN** associations and events roll back, owned confirmation claims are released safely, and unconsumed uploads remain private and attributed

### Requirement: Edit photo readiness is independent per attachment

Retained files and ready variants SHALL remain unchanged and independently readable while newly
attached photos process through the existing creation worker. Save SHALL NOT require complete new
variants. Product readers MUST sign only eligible ready variants and use nullable previews/fallbacks
for pending or failed variants without hiding ready retained photos. No detached preparation phase
or later memory-finalization transaction SHALL be required.

#### Scenario: New photo is pending beside retained photos
- **WHEN** Save retains ready A/C and attaches pending D
- **THEN** A/C continue to receive ready signed previews and only D requires a fallback until ready

#### Scenario: Existing retained variant is unavailable
- **WHEN** an edit retains an attachment whose variant is absent or failed
- **THEN** that variant keeps its normal fallback without regeneration or blocking the save

#### Scenario: New photo fails verification
- **WHEN** asynchronous content checks permanently reject a newly attached original
- **THEN** it remains unavailable without downgrading retained files, reverting metadata, or restoring explicitly removed photos

### Requirement: Committed edit removal preserves file attribution

Explicit removal SHALL detach obsolete photos and mark their original/derivative families `deleting`
in the save transaction, even if additions are not ready. Keep keys, source attribution, and records
for deferred physical cleanup. Fresh reads MUST NOT serve removed families. Earlier signed URLs can
work until effective expiry. No delayed replacement relationship, physical object deletion, cleanup
scheduler, or automatic restoration on new-photo failure SHALL be introduced.

#### Scenario: Removed photo has an unready intended replacement
- **WHEN** Save removes B and adds D before D is ready
- **THEN** B is detached and retired at commit without waiting for D; retained A/C stay usable

#### Scenario: Partial upload is abandoned before Save
- **WHEN** issuance or upload is not followed by a committed edit
- **THEN** unconsumed files remain privately attributed without a scheduled-deletion promise

#### Scenario: Worker finishes after removal
- **WHEN** in-flight storage work finishes after its root loses attachment eligibility or becomes deleting
- **THEN** no active readiness is revived and any written output remains attributable for deferred cleanup

#### Scenario: Save transaction rolls back
- **WHEN** persistence fails after detachment or retirement writes inside the transaction
- **THEN** attachment and retirement changes roll back together with the memory update and the prior photo set remains current

### Requirement: Memory deletion moves attached files to deleting

When a memory is soft-deleted, every file attached to it through its photo association and every derivative
of those files SHALL move to the `deleting` status within the deletion transaction. The transition MUST NOT
remove storage objects, delete file rows, or alter attribution. `deleting` remains a non-serving state, and
actual removal stays with the deferred cleanup capability.

#### Scenario: Deletion marks the attached original and its variants
- **WHEN** a memory's deletion commits
- **THEN** each attached original and derivative has status `deleting` and keeps its object key and attribution

#### Scenario: Deleting file cannot be revived
- **WHEN** a verification or generation operation holding an expired or stale lock attempts to write a `deleting` file
- **THEN** its database mutation is rejected and the file stays `deleting`

#### Scenario: Deleting file is not served
- **WHEN** a product read or API request resolves a `deleting` file
- **THEN** it returns no bytes, signed URL, or object key for that file

#### Scenario: Derivative publication races with deletion
- **WHEN** derivative publication and memory deletion overlap
- **THEN** publication committed first is included in the cascade, and publication resuming after deletion cannot introduce active derivatives or restore readiness

#### Scenario: Storage write is already in flight
- **WHEN** an image worker's storage write finishes after its parent memory is deleted
- **THEN** its output remains attributable for deferred cleanup and is not published as a serving file; database locks do not promise cancellation of storage I/O
