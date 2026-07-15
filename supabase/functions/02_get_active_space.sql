create or replace function public.get_active_space()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', space.id,
    'invite_code', space.invite_code,
    'invite_code_expires_at', space.invite_code_expires_at,
    'name', space.name,
    'start_date', space.start_date
  )
  from public.space_members space_member
  inner join public.spaces space on space.id = space_member.space_id
  where space_member.user_id = auth.uid()
    and space_member.is_active = true
    and space.is_active = true
  limit 1;
$$;

revoke execute on function public.get_active_space() from public;
revoke execute on function public.get_active_space() from anon;
grant execute on function public.get_active_space() to authenticated;
