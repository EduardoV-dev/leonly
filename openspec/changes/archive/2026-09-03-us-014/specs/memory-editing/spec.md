## MODIFIED Requirements

### Requirement: Prefilled editable memory state
The editor SHALL prefill the current title, description, memory date, location, placement, complete ordered
photo set, and selected cover in the shared memory form UI. Every prefilled field and photo control that is
editable during creation SHALL remain editable during editing, including adding new photos, removing retained
or newly selected photos, removing all photos, and changing the cover. Existing photo previews MUST use opaque
same-origin media URLs whose every request reauthorizes the parent memory before returning bytes; the browser
and mutation request MUST NOT expose or accept Storage object paths, signed Storage credentials, or redirects
as authority. Creator, creation timestamp, comments, and reactions SHALL NOT be editable by US-007.

#### Scenario: Memory has complete editable data
- **WHEN** an authorized member opens a memory with metadata, photos, and a cover
- **THEN** every editable value is prefilled, photos appear in their current order, and the current cover is
  selected

#### Scenario: Memory has no optional values or photos
- **WHEN** an authorized member opens a memory without description, location, photos, or cover
- **THEN** the editor presents valid empty optional fields and an empty photo selection without fabricating
  content
