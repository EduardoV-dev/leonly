# 04. Build Places and Currency

Release: future, after the MVP queue. Follow this order to establish shared currency and budget
contracts before building the views that consume them.

## Work order

| Order | Task | Outcome | Prerequisites |
| --- | --- | --- | --- |
| 01 | [Preferred currency (US-016)](01-us-016-set-preferred-currency.md) | Per-member USD/NIO preference and a reliable conversion contract. | Active-space setup and settings. |
| 02 | [Add a place (US-017)](02-us-017-add-place.md) | Save a place with optional cover, expenses, and initial rating. | Currency contract. |
| 03 | [Manage expenses (US-018)](03-us-018-manage-place-expense-items.md) | Edit original-currency items and show one converted total. | Currency contract and place creation. |
| 04 | [Ranked places (US-019)](04-us-019-view-ranked-places.md) | Deterministic, paginated place cards and sorting. | Currency, places, and expense totals. |
| 05 | [Place detail (US-020)](05-us-020-view-place-detail.md) | Full details, budget, ratings, and an action region. | Tasks 01–04. |
| 06 | [Rate a place (US-021)](06-us-021-rate-place.md) | Set, replace, or clear the member's rating. | Creation, list, and detail. |
| 07 | [Edit a place (US-022)](07-us-022-edit-place.md) | Update details and cover safely. | Creation and detail; can run independently of rating. |
| 08 | [Delete a place (US-023)](08-us-023-delete-place.md) | Confirmed soft deletion removes the place from all product views. | Tasks 02–07. |

Each task lists decisions to resolve before affected implementation. When its acceptance criteria
and verification checks pass, delete it and its row. Missing earlier task files do not require
recreating finished work; use the resulting contracts.
