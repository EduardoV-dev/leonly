# Backlog

Start with the lowest-numbered epic, then its lowest-numbered task. This backlog contains only
unfinished work. Delete entries when they are done; no completion log belongs here.

## Work order

| Order | Epic | Work left | Release |
| --- | --- | --- | --- |
| 01 | [Complete storage and image operations](epics/01-complete-supabase-migration/README.md) | Implement safe storage cleanup and recovery of unpublished image events. | MVP |
| 02 | [Verify the day counter](epics/02-shared-space/README.md) | Check calendar-day behavior and fix any gaps. | MVP |
| 03 | [Verify global UI states](epics/03-security-and-global-states/README.md) | Check loading, empty, error, retry, and accessibility behavior across MVP flows. | MVP |
| 04 | [Build places and currency](epics/04-places-and-currency/README.md) | Add currency preferences, places, budgets, ranking, ratings, editing, and deletion. | Future |
| 05 | [Expand the dashboard](epics/05-dashboard-expansion/README.md) | Add real memory and place previews after their dependencies are ready. | Future |

This is the recommended execution order, not a claim that every task blocks the next one. Each epic
lists actual prerequisites. Finish the MVP queue before starting future-release work.

## Reading a task

1. Read **Work to do** for the next action and any decisions needed before implementation.
2. Follow its requirements and acceptance criteria; resolve listed decisions before affected work.
3. Verify the result using its verification notes, then delete the task.

OpenSpec specifications define normative behavior. Story IDs such as `US-016` are reference IDs,
not execution order; a dependency ID absent from this backlog is not automatically unfinished.

## Lifecycle

1. Add new work as a task with an outcome, remaining actions, prerequisites, and completion criteria.
2. Use two-digit prefixes on epic folders and task filenames. Order tasks within each epic; keep
   `README.md` as the index. Update index links when adding, moving, or removing tasks. Refer to
   prerequisites by capability and story ID, so deleting finished tasks does not break other tasks.
3. Keep tasks while implementation or required verification remains. Once done, delete the file and
   its index row. Delete an epic folder and its main-index row when no tasks remain.
4. Leave numbering gaps after deletion; renumber only when priorities change. Do not add completed
   sections, checked-off history, or replacement records for deleted tasks.

Backlog deletion does not depend on OpenSpec archival. Keep durable contracts in OpenSpec and any
needed operational instructions in the owning application's or infrastructure's documentation.
