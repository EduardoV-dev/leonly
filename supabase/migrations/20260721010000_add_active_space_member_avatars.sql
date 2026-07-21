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
    'active_members', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'avatar_url', profile.avatar_url,
            'display_name', member.display_name
          )
          order by member.role
        ),
        '[]'::jsonb
      )
      from public.space_members member
      inner join public.users profile on profile.id = member.user_id
      where member.space_id = space.id
        and member.is_active = true
        and profile.is_active = true
    ),
    'member_names', (
      select jsonb_agg(member.display_name order by member.role)
      from public.space_members member
      where member.space_id = space.id
        and member.is_active = true
    ),
    'name', space.name,
    'onboarding_completed_at', space_member.onboarding_completed_at,
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
