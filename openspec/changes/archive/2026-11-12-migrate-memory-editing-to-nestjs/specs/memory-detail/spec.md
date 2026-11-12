## MODIFIED Requirements

### Requirement: Detail extension regions respect visibility

Timeline and Vault detail screens SHALL enable reactions, migrated comments, Edit, the migrated Delete
action, and one contextual placement action for authorized memories. Timeline detail SHALL offer Move
to Vault; Vault detail SHALL offer Move to Timeline. Edit SHALL link to the shared server-authorized
editor. Gallery navigation, related links, contextual back navigation, and Delete confirmation MUST
remain available.

#### Scenario: Timeline memory detail is composed
- **WHEN** the detail view renders an authorized Timeline memory
- **THEN** reactions, comments, Edit, Delete, and Move to Vault are available while Move to Timeline is absent

#### Scenario: Vault memory detail is composed
- **WHEN** the detail view renders an authorized Vault memory
- **THEN** reactions, comments, Edit, Delete, and Move to Timeline are available while Move to Vault is absent

### Requirement: Deterministic private photo presentation

Authorized detail SHALL present attached photos with the selected cover first and remaining photos
in persisted relative order. Ready cover/detail variants SHALL use direct GET URLs signed for 300
seconds, subject to earlier credential expiry; absent variants SHALL be nullable. Fresh reads MUST
omit removed photos and expose no standalone keys or reusable credentials. Issued URLs can remain
usable until effective expiry after removal, revocation, or deletion. After an edit commits, retained
ready photos SHALL remain normally usable while only pending or failed variants use fallbacks.
Explicit removals SHALL disappear at commit without waiting for additions. A newly selected unready
cover MAY show its normal fallback without hiding other ready gallery photos or silently changing
the selected cover. Later processing failure MUST NOT restore removed photos or roll back the edit.

#### Scenario: Selected cover is not the first persisted photo
- **WHEN** the selected cover has a later persisted position
- **THEN** the gallery places it first and keeps every other photo in persisted relative order

#### Scenario: Memory has no photos
- **WHEN** an authorized memory has no attached photos
- **THEN** detail shows its accessible no-photo fallback

#### Scenario: One photo response is unavailable
- **WHEN** an authorized photo's signed URL cannot deliver bytes
- **THEN** that position shows an accessible fallback while the remaining photos stay usable

#### Scenario: Editor removes a photo
- **WHEN** a successful edit detaches a photo
- **THEN** subsequent detail reads immediately omit it and issue no new URL even if added photos are still processing, while a previously issued URL can work until effective expiry

#### Scenario: Retained and newly added photos are mixed
- **WHEN** Save retains ready A/C, removes B, and adds pending D
- **THEN** fresh detail renders A/C normally, omits B, and shows an accessible fallback only for D's unavailable variants

#### Scenario: Selected new cover is not ready
- **WHEN** the committed selected cover has no ready variant but other retained photos are ready
- **THEN** cover consumers use their normal fallback and ready retained gallery photos stay usable without a silent cover change

#### Scenario: Added photo fails after Save
- **WHEN** a newly attached photo permanently fails processing
- **THEN** its unavailable fallback does not hide retained ready photos, undo saved metadata, or restore removed photos

### Requirement: Detail loading and recoverable failure feedback

Detail SHALL show dedicated loading and retryable read-failure states without stale content presented
as current. Retry and refresh SHALL preserve the requested route, reauthorize access, and issue fresh
signed URLs for eligible variants, including newly ready edit additions. Realtime partner updates and
automatic image-readiness polling are not required.

#### Scenario: Initial detail read is pending
- **WHEN** an authorized detail read has not completed
- **THEN** the route shows detail-shaped loading without fabricated content

#### Scenario: Detail read fails
- **WHEN** a read fails for a reason other than an unavailable memory
- **THEN** the route shows no stale detail and provides an accessible retry action

#### Scenario: Authorized detail route is refreshed
- **WHEN** a member directly refreshes or retries detail
- **THEN** current authorization and detail are resolved with newly signed URLs for eligible photos
