# 01. Complete Storage and Image Operations

Implement safe storage cleanup and image-event recovery on the current backend. Release: MVP.

## Work order

| Order | Task | Finish when |
| --- | --- | --- |
| 02 | [Implement storage cleanup](02-implement-file-cleanup.md) | Eligible unused files are removed safely by a verified deployed cleanup path. |
| 03 | [Recover unpublished image events](03-recover-unpublished-image-events.md) | Queue outages no longer leave committed image events unpublished indefinitely. |

## Prerequisites

- Cleanup uses the current file/upload and worker contracts and must define retention before
  removing objects.
- Image-event recovery uses the existing transactional outbox and image worker.
- These are independent tasks; neither needs to wait for the other.

Use the current OpenSpec contracts rather than historical story text. Delete each task and its row
after its remaining checks pass.
