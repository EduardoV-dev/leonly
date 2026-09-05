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

create or replace function public.rename_active_space(
  p_name text,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  matching_space public.spaces%rowtype;
  normalized_name text := pg_catalog.btrim(p_name);
begin
  if current_user_id is null then
    return pg_catalog.jsonb_build_object('status', 'unavailable');
  end if;

  if normalized_name is null
    or pg_catalog.char_length(normalized_name) < 2
    or pg_catalog.char_length(normalized_name) > 100
    or p_expected_updated_at is null then
    return pg_catalog.jsonb_build_object('status', 'invalid');
  end if;

  select space.* into matching_space
  from public.space_members as member
  inner join public.spaces as space on space.id = member.space_id
  inner join public.users as profile on profile.id = member.user_id
  where member.user_id = current_user_id
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
  for update of space;

  if matching_space.id is null then
    return pg_catalog.jsonb_build_object('status', 'unavailable');
  end if;

  if not exists (
    select 1
    from public.space_members as member
    inner join public.users as profile on profile.id = member.user_id
    where member.id is not null
      and member.space_id = matching_space.id
      and member.user_id = current_user_id
      and member.deleted_at is null
      and profile.deleted_at is null
  ) then
    return pg_catalog.jsonb_build_object('status', 'unavailable');
  end if;

  if matching_space.updated_at <> p_expected_updated_at then
    return pg_catalog.jsonb_build_object(
      'status', 'conflict',
      'name', matching_space.name,
      'updated_at', matching_space.updated_at
    );
  end if;

  update public.spaces
  set name = normalized_name,
    updated_by_user_id = current_user_id
  where id = matching_space.id
  returning * into matching_space;

  return pg_catalog.jsonb_build_object(
    'status', 'updated',
    'name', matching_space.name,
    'updated_at', matching_space.updated_at
  );
end;
$$;

revoke execute on function public.rename_active_space(text, timestamptz) from public;
revoke execute on function public.rename_active_space(text, timestamptz) from anon;
grant execute on function public.rename_active_space(text, timestamptz) to authenticated;
