create or replace function public.get_active_space_settings()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'id', space.id,
    'name', space.name,
    'start_date', space.start_date,
    'invite_code', case
      when active_members.member_count = 1 then space.invite_code
      else null
    end,
    'invite_code_expires_at', case
      when active_members.member_count = 1 then space.invite_code_expires_at
      else null
    end,
    'invite_code_is_available', case
      when active_members.member_count = 1
        and space.invite_code is not null
        and space.invite_code_expires_at > pg_catalog.clock_timestamp()
      then true
      else false
    end,
    'active_members', active_members.members
  )
  from public.space_members as current_member
  inner join public.spaces as space on space.id = current_member.space_id
  inner join public.users as current_profile on current_profile.id = current_member.user_id
  cross join lateral (
    select
      pg_catalog.count(*) as member_count,
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'membership_id', member.id,
          'display_name', member.display_name,
          'avatar_url', profile.avatar_url,
          'created_at', member.created_at,
          'role', member.role,
          'is_current_member', member.id = current_member.id
        )
        order by member.role
      ) as members
    from public.space_members as member
    inner join public.users as profile on profile.id = member.user_id
    where member.space_id = space.id
      and member.deleted_at is null
      and profile.deleted_at is null
  ) as active_members
  where current_member.user_id = auth.uid()
    and current_member.deleted_at is null
    and space.deleted_at is null
    and current_profile.deleted_at is null
  limit 1;
$$;

revoke execute on function public.get_active_space_settings() from public;
revoke execute on function public.get_active_space_settings() from anon;
grant execute on function public.get_active_space_settings() to authenticated;
