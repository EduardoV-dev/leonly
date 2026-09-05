create or replace function public.get_active_space_settings()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'id', space.id,
    'name', space.name,
    'updated_at', space.updated_at,
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
          'updated_at', member.updated_at,
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

create or replace function public.update_active_membership_display_name(
  p_display_name text,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  matching_membership public.space_members%rowtype;
  normalized_display_name text := pg_catalog.btrim(p_display_name);
begin
  if current_user_id is null then
    return pg_catalog.jsonb_build_object('status', 'unavailable');
  end if;

  if normalized_display_name is null
    or pg_catalog.char_length(normalized_display_name) < 2
    or pg_catalog.char_length(normalized_display_name) > 100
    or p_expected_updated_at is null then
    return pg_catalog.jsonb_build_object('status', 'invalid');
  end if;

  select member.* into matching_membership
  from public.space_members as member
  inner join public.spaces as space on space.id = member.space_id
  inner join public.users as profile on profile.id = member.user_id
  where member.user_id = current_user_id
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
  for update of member;

  if matching_membership.id is null then
    return pg_catalog.jsonb_build_object('status', 'unavailable');
  end if;

  if not exists (
    select 1
    from public.space_members as member
    inner join public.spaces as space on space.id = member.space_id
    inner join public.users as profile on profile.id = member.user_id
    where member.id = matching_membership.id
      and member.user_id = current_user_id
      and member.deleted_at is null
      and space.deleted_at is null
      and profile.deleted_at is null
  ) then
    return pg_catalog.jsonb_build_object('status', 'unavailable');
  end if;

  if matching_membership.updated_at <> p_expected_updated_at then
    return pg_catalog.jsonb_build_object(
      'status', 'conflict',
      'display_name', matching_membership.display_name,
      'updated_at', matching_membership.updated_at
    );
  end if;

  update public.space_members
  set display_name = normalized_display_name
  where id = matching_membership.id
  returning * into matching_membership;

  return pg_catalog.jsonb_build_object(
    'status', 'updated',
    'display_name', matching_membership.display_name,
    'updated_at', matching_membership.updated_at
  );
end;
$$;

revoke execute on function public.update_active_membership_display_name(text, timestamptz) from public;
revoke execute on function public.update_active_membership_display_name(text, timestamptz) from anon;
grant execute on function public.update_active_membership_display_name(text, timestamptz) to authenticated;
