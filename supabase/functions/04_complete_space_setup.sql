create or replace function public.complete_space_setup()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  update public.space_members space_member
  set onboarding_completed_at = coalesce(space_member.onboarding_completed_at, timezone('utc', now()))
  from public.spaces space
  where space_member.space_id = space.id
    and space_member.user_id = current_user_id
    and space_member.is_active = true
    and space.is_active = true;

  if not found then
    raise exception 'You do not belong to an active space.';
  end if;
end;
$$;

revoke execute on function public.complete_space_setup() from public;
revoke execute on function public.complete_space_setup() from anon;
grant execute on function public.complete_space_setup() to authenticated;
