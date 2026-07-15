create or replace function public.find_joinable_space(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  matching_space_id bigint;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if exists(
    select 1
    from public.space_members space_member
    inner join public.spaces space on space.id = space_member.space_id
    where space_member.user_id = current_user_id
      and space_member.is_active = true
      and space.is_active = true
  ) then
    raise exception 'You already belong to an active space.';
  end if;

  select space.id into matching_space_id
  from public.spaces space
  where space.invite_code = lower(p_invite_code)
    and space.is_active = true
    and (space.invite_code_expires_at is null or space.invite_code_expires_at > now())
    and exists(
      select 1
      from public.space_members space_member
      where space_member.space_id = space.id
        and space_member.role = 'owner'
        and space_member.is_active = true
    )
    and not exists(
      select 1
      from public.space_members space_member
      where space_member.space_id = space.id
        and space_member.role = 'partner'
        and space_member.is_active = true
    );

  if matching_space_id is null then
    raise exception 'No space found for this invite code.';
  end if;

  return jsonb_build_object('id', matching_space_id);
end;
$$;

revoke execute on function public.find_joinable_space(text) from public;
revoke execute on function public.find_joinable_space(text) from anon;
grant execute on function public.find_joinable_space(text) to authenticated;
