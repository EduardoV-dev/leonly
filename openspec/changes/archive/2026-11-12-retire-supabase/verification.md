# Verification Record

## Repository gates (task 4.2, 2026-11-12)

Environment accounting: no root `.env`/`.env.local`; the auto-loaded `apps/web-app/.env` (untracked)
contains only `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_SITE_URL` — zero Supabase configuration
was present during all checks. No secrets exposed here.

| Gate | Result |
| --- | --- |
| `pnpm --filter web-app check` | Passed — Biome clean, 387 files, no fixes needed |
| `pnpm --filter web-app typecheck` | Passed — route types generated, `tsc` clean |
| `pnpm --filter web-app test:run` | Passed — 71 files, 379 tests |
| `pnpm --filter web-app build` | Passed — route tree contains only `/api/auth/[...path]` under `/api` |

## Live local-integration checks (task 4.3, 2026-11-12)

Local integrations were running with configured values: `api-postgres-1` (5434, healthy),
`api-redis-http-1` (8079), `api-floci-1` (4566, healthy), Nest API (3001), and the `next dev`
web app (3000) serving the post-removal source (started after route removal).

| Check | Result | Evidence |
| --- | --- | --- |
| Retired frontend routes perform no legacy work | Verified | `POST /api/memories` → 404; `POST /api/memories/uploads` → 404; `GET /api/memories/:memoryId/photos/:photoId/detail` → 404 against the running dev server |
| Web app serves without Supabase configuration | Verified | App responds (307 to `/auth` for an unauthenticated browser request) with zero Supabase env |
| Better Auth proxy + sign-in initiation | Verified | `GET /api/auth/get-session` through the proxy → 200; `POST /api/auth/sign-in/social` returns the Google authorization URL with the configured frontend callback (`http://localhost:3000/api/auth/callback/google`) |
| Nest health | Verified | `GET http://localhost:3001/api/health` → `{"status":"ok","checks":{"database":"up","redis":"up"}}` |
| Sign-in/out as a member (OAuth consent) | Pending | Requires the human's Google account consent; not automatable here |
| Create/join space, onboarding, settings | Pending | Requires a signed-in member session |
| Timeline/Vault/detail reads with signed URLs | Pending | Requires a signed-in member session |
| Create/edit/place/delete memories | Pending | Requires a signed-in member session |
| Comments, replies, reactions | Pending | Requires a signed-in member session |
| Upload-to-ready image processing | Pending | Requires a signed-in member session and a real upload |

Behavior coverage for the pending journeys is provided by the retained 379-test suite (detail,
editing, creation request, placement, reactions, comments, upload staging), but the live
session-based checks above remain pending for an operator-led browser pass.
