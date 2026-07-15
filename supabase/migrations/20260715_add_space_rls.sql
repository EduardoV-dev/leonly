alter table public.users enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;

drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
on public.users
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can create own profile" on public.users;
create policy "Users can create own profile"
on public.users
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can view own membership" on public.space_members;
create policy "Users can view own membership"
on public.space_members
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Members can view their spaces" on public.spaces;
create policy "Members can view their spaces"
on public.spaces
for select
to authenticated
using (
  exists (
    select 1
    from public.space_members
    where space_members.space_id = spaces.id
      and space_members.user_id = (select auth.uid())
      and space_members.is_active
  )
);

revoke execute on function public.create_space(text, text, date) from public;
revoke execute on function public.create_space(text, text, date) from anon;
grant execute on function public.create_space(text, text, date) to authenticated;
