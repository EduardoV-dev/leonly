## MODIFIED Requirements

### Requirement: Protect private photo objects by available-memory membership
The system SHALL store memory photo objects in a private Supabase Storage bucket. Each
`memory_photos.object_path` MUST identify an object whose name is scoped to that photo's owning space. A
requester MAY select object metadata or download an object only when authenticated as an available member
of the referenced photo's available parent memory space. Public bucket access, public object URLs, and
client-side service-role credentials MUST NOT be available.

The system SHALL permit a server-controlled creation workflow to stage a prospective photo object only
after it has derived an authenticated available member and that member's active space. A staged object MUST
remain unreadable to members until the parent memory and photo metadata are available. Each staged object
MUST be durably associated with its creation attempt before upload so that a failed or interrupted attempt
can remove it. The browser MUST NOT receive a storage object path or a credential that bypasses this
authorization boundary.

#### Scenario: Available member reads a cover object

- GIVEN a cover photo belongs to an available memory in the requester's available space
- WHEN the requester reads its object metadata or downloads the object
- THEN Storage authorizes the request for that object only

#### Scenario: Object belongs to an unavailable or other-space memory

- GIVEN a photo object is referenced by a deleted, unauthorized, or other-space parent memory
- WHEN the requester reads its object metadata or downloads the object
- THEN Storage returns no authorized object and exposes no parent-memory metadata

#### Scenario: Creation stages a prospective object

- GIVEN an authenticated available member starts an authorized memory-creation attempt
- WHEN the server stages a validated photo object for that attempt
- THEN the object is scoped to the member's active space, is unreadable before final persistence, and is
  tracked for completion or cleanup

#### Scenario: Staged creation cannot complete

- GIVEN a staged photo object belongs to a creation attempt that fails or is interrupted
- WHEN the attempt cannot persist an available parent memory and photo metadata
- THEN members cannot read the staged object and server-side cleanup removes it
