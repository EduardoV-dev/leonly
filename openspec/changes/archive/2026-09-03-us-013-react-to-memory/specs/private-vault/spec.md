## ADDED Requirements

### Requirement: Vault card reaction summary and controls
The Vault card reaction extension region SHALL display the authorized member's current reaction and
authoritative counts for every supported reaction type on each eligible card. Controls MUST be independently
interactive from the card's detail link, remain available for shared Private Vault memories only, and refresh
their summary after a completed local reaction action. Realtime partner updates are not required.

#### Scenario: Vault card shows reactions
- **WHEN** an eligible Vault card has reaction data
- **THEN** the card shows its current counts and the requesting member's confirmed selection without nesting a control in the detail link

#### Scenario: Member reacts from a Vault card
- **WHEN** a member completes a local reaction action on a Vault card
- **THEN** that card refreshes to the authoritative summary and the Vault remains otherwise usable
