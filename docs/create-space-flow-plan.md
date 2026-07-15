# Create Space Flow Plan

Status: in progress

## Decisions

- Keep existing routes under `/welcome/create/*` and `/welcome/join/*`.
- Use `/` as the temporary dashboard route and render `hello` for now.
- Invite code display/input format is `AAA-XXXXX`.
- Invite code generation uses a 3-letter prefix plus 5 random characters.
- `partner_placeholder_name` is ignored for now.
- Use app-side user sync before calling an RPC that owns transactional space creation.
- Keep the smallest thing that works. No Sequelize.

## Invite Code Rules

- Stored normalized: lowercase, no hyphen.
- Displayed in UI: uppercase/lowercase is fine visually, with hyphen after 3 chars.
- Prefixes:

```ts
const invite_prefixes = ["leo", "lov", "mem", "our", "duo", "two", "joy", "sun", "lny"];
```

- Random alphabet: `abcdefghjkmnpqrstuvwxyz23456789`

## Tasks

- [x] Update join invite-code placeholder to `LNY-7KLP0`.
- [x] Add join invite-code masking for `AAA-XXXXX`.
- [x] Update invite-code validation to match `AAA-XXXXX`.
- [x] Make `/` render `hello` for now.
- [x] Stop hardcoded authenticated redirect to `/welcome/create/start`.
- [x] Add app-side current-user sync into `public.users`.
- [x] Add active-space lookup helper for the authenticated user.
- [x] Add SQL RPC/migration for transactional `create_space`.
- [x] Add thin server-side wrapper that calls the RPC.
- [x] Replace fake create flow submit with real server-side creation.
- [x] Make `/welcome/create/invite` fetch the persisted active space.
- [x] Redirect users with an active space to `/`.
- [x] Redirect users without a space from invite screen back into create flow.
- [x] Update tests for invite-code format and create-flow copy.
- [x] Run check, typecheck, and targeted tests.

## Remaining

- [ ] Run the SQL migration in the actual Supabase project.
- [ ] Verify the RPC against the live schema and RLS setup.
- [ ] Do one real end-to-end create flow against the database.

## Notes

- ponytail: user sync stays outside the RPC to keep the SQL smaller and less brittle.
- ponytail: the RPC only owns the transactional write path for `spaces` + `space_members`.
