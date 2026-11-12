## ADDED Requirements

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
