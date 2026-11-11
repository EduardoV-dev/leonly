# Load Standards Before Coding

Read complete guidance once per active context; reuse already-loaded, unchanged rules. Before affected
work, reload missing/changed guidance and load newly applicable rules, not the entire selection again.

1. Read the target project's applicable instructions. Inspect the intended files, their owning
   package/configuration, relevant callers/contracts/tests, and actual runtime/technology usage.
   Inspect the owning project's formatter/linter, installed versions, inherited configuration,
   scripts, and CI; do not assume a formatter inserts semantic group boundaries.
2. Resolve `ev-code-rules` and companions from the harness registry or known project/user skill
   locations, including `~/.agents/skills/`. Prefer a project-local skill of the same name, as the
   project guidance requires. Report shadowing with the exact selected path; never silently
   mix incompatible global/project versions. Missing required rules or unresolved policy conflicts
   block affected implementation until resolved; do not invent or auto-install standards.
3. Read the selected core's complete `references/general.md`. Add `frontend.md` for UI/browser
   behavior and `backend.md` for server/data operations. Shared-only code needs neither; mixed code
   needs both. Server rendering alone is frontend; tests follow their subject.
   Read its linked `references/logical-code-grouping.md` to select compatible spacing enforcement
   and distinguish automated checks from semantic grouping review.
4. Read each applicable technology skill and its exceptions. Determine applicability from scoped
   behavior, imports, directives, and ownership, not installed dependencies alone:

   | Scoped usage | Skills |
   | --- | --- |
   | TypeScript source/declarations/configuration | `ev-typescript-rules` |
   | React components/hooks/JSX; Next.js framework boundaries | `ev-react-rules`; `ev-nextjs-rules` as applicable |
   | NestJS providers/modules/endpoints/bootstrap/tests | `ev-nestjs-rules` |
   | First-party JSON API producers/consumers or pagination implementation | `ev-api-contracts` plus applicable backend/TypeScript rules |
   | PostgreSQL schema, timestamp handling, transactions, or locking | `ev-postgres` |

5. Record internally the scope, selected installed rule paths, and available skill metadata/version.
   Resolve references relative to each installed skill; do not search for an upstream checkout or run
   Git provenance checks on it. Missing source revision/dirty-state information is not a blocker, and
   the target project's Git revision is not an installed skill's revision. Reuse rules without starting a review, spawning
   reviewers, or requiring review coverage artifacts. Reselect before editing a new domain.
   Read the resolved core's `references/generation-review.md` for implementation checks, follow-ups,
   and context recovery. Applying standards does not initiate a code review.

Repository rules take priority over existing patterns only where the applicable standards explicitly
say so; preserve their exceptions and the harness's instruction hierarchy. Surface genuine conflicts
with project instructions instead of silently choosing a policy. Technology without a maintained
companion remains a reported coverage gap; apply available core rules without inventing technology rules.

Concrete follow-up edits remain implementation, even when called fixes or supplied after the user's
own review. Check changed behavior and affected dependencies; a requested review,
standards check/fix uses the check-and-fix workflow instead.

Before completing implementation, run relevant documented project checks and verify affected integration.
Reuse successful results only while they cover the completed state. Do not require review checkpoints,
per-rule evidence records, or final review-coverage reconciliation. A pre-existing defect outside the
task is not permission to expand the change. Report what works and material verification gaps without
a separate standards report or claims of full compliance. Explicit standards check/fix requests use the
check-and-fix workflow and chat report with every finding over the entire requested scope.
