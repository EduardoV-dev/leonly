create or replace function public.update_active_space_start_date(
  p_start_date text,
  p_timezone text,
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
  local_today text;
begin
  if current_user_id is null then
    return pg_catalog.jsonb_build_object('status', 'unavailable');
  end if;

  if p_start_date is null
    or p_timezone is null
    or p_expected_updated_at is null
    or p_start_date !~ '^\d{4}-\d{2}-\d{2}$'
    or pg_catalog.to_char(pg_catalog.to_date(p_start_date, 'YYYY-MM-DD'), 'YYYY-MM-DD') <> p_start_date then
    return pg_catalog.jsonb_build_object('status', 'invalid');
  end if;

  begin
    local_today := pg_catalog.to_char(
      pg_catalog.clock_timestamp() at time zone p_timezone,
      'YYYY-MM-DD'
    );
  exception when invalid_parameter_value then
    return pg_catalog.jsonb_build_object('status', 'invalid');
  end;

  if p_start_date > local_today then
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
    where member.space_id = matching_space.id
      and member.user_id = current_user_id
      and member.deleted_at is null
      and profile.deleted_at is null
  ) then
    return pg_catalog.jsonb_build_object('status', 'unavailable');
  end if;

  if matching_space.updated_at <> p_expected_updated_at then
    return pg_catalog.jsonb_build_object(
      'status', 'conflict',
      'start_date', matching_space.start_date,
      'updated_at', matching_space.updated_at
    );
  end if;

  update public.spaces
  set start_date = p_start_date::date,
    updated_by_user_id = current_user_id
  where id = matching_space.id
  returning * into matching_space;

  return pg_catalog.jsonb_build_object(
    'status', 'updated',
    'start_date', matching_space.start_date,
    'updated_at', matching_space.updated_at
  );
end;
$$;

revoke execute on function public.update_active_space_start_date(text, text, timestamptz) from public;
revoke execute on function public.update_active_space_start_date(text, text, timestamptz) from anon;
grant execute on function public.update_active_space_start_date(text, text, timestamptz) to authenticated;
