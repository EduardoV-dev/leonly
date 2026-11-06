## MODIFIED Requirements

### Requirement: Complete post-deletion unavailability
After deletion succeeds, subsequent authorized product and API reads MUST exclude the memory and its related data, and no new photo URL SHALL be issued for it. The system SHALL retain underlying records and media according to the retention policy. Previously issued signed photo URLs may remain usable until effective expiry; already downloaded bytes cannot be recalled. Deleted memories and related records MUST NOT contribute to product counts or aggregates.

#### Scenario: Product projections refresh after deletion
- **WHEN** a memory deletion succeeds
- **THEN** subsequent Timeline, Vault, dashboard, detail, comment, reaction, count, and aggregate reads omit the memory and related data

#### Scenario: Retained photo is requested after deletion
- **WHEN** a caller holds a signed photo URL issued before deletion
- **THEN** the URL may remain usable until effective expiry, but no fresh URL is issued for the deleted memory

#### Scenario: Deleted memory is addressed directly
- **WHEN** a caller addresses the deleted memory, its comments, its reactions, or repeats deletion
- **THEN** the system returns the same generic not-found outcome used for every unavailable memory

### Requirement: Confirmed deletion on direct memory detail
Read-only Timeline and Vault detail screens SHALL NOT expose or mount Delete actions or confirmation dialogs. Summary surfaces MUST NOT expose Delete under this capability.

#### Scenario: Member views detail or a summary
- **WHEN** a member views a memory detail or summary surface
- **THEN** no Delete action, confirmation, or deletion request is present

#### Scenario: Member views a summary surface
- **WHEN** a member views a summary card
- **THEN** no Delete action is present

#### Scenario: Member cancels deletion
- **WHEN** a member views a read-only detail screen
- **THEN** no deletion confirmation or request is present

#### Scenario: Member confirms deletion by keyboard
- **WHEN** a keyboard user views a read-only detail screen
- **THEN** no deletion action or confirmation is available
