create or replace function public.process_space_invite(
  p_invite_code text,
  p_display_name text default null,
  p_redeem boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_time timestamptz := pg_catalog.clock_timestamp();
  current_user_id uuid := auth.uid();
  matching_space public.spaces%rowtype;
  normalized_invite_code text;
  rate_limit public.join_attempt_limits%rowtype;
  recent_failures timestamptz[];
  retry_after integer;
  profile_display_name text;
  fallback_display_name constant text := 'Leonly User';
  trimmed_display_name text := pg_catalog.btrim(p_display_name);
begin
  if current_user_id is null then
    raise exception using errcode = 'L1001', message = 'Authentication is required.';
  end if;

  insert into public.join_attempt_limits (user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;

  select * into rate_limit
  from public.join_attempt_limits
  where user_id = current_user_id
  for update;

  select coalesce(
    pg_catalog.array_agg(failed_at order by failed_at),
    array[]::timestamptz[]
  )
  into recent_failures
  from pg_catalog.unnest(rate_limit.failed_attempts) as failures(failed_at)
  where failed_at > request_time - interval '10 minutes';

  if rate_limit.locked_until > request_time then
    retry_after := pg_catalog.ceil(
      extract(epoch from rate_limit.locked_until - request_time)
    )::integer;

    return pg_catalog.jsonb_build_object('status', 'locked', 'retry_after', retry_after);
  end if;

  if pg_catalog.cardinality(recent_failures) >= 5 then
    update public.join_attempt_limits
    set failed_attempts = recent_failures,
      locked_until = request_time + interval '10 minutes',
      updated_at = request_time
    where user_id = current_user_id;

    return pg_catalog.jsonb_build_object('status', 'locked', 'retry_after', 600);
  end if;

  update public.join_attempt_limits
  set failed_attempts = recent_failures,
    locked_until = null,
    updated_at = request_time
  where user_id = current_user_id;

  normalized_invite_code := pg_catalog.regexp_replace(
    pg_catalog.lower(coalesce(p_invite_code, '')),
    '^[\t\n\r\f\v ]+|[\t\n\r\f\v ]+$',
    '',
    'g'
  );

  if normalized_invite_code !~
    '^(leo|lov|mem|our|duo|two|joy|sun|lny)-?[abcdefghjkmnpqrstuvwxyz23456789]{5}$' then
    update public.join_attempt_limits
    set failed_attempts = recent_failures || request_time,
      updated_at = request_time
    where user_id = current_user_id;

    return pg_catalog.jsonb_build_object('status', 'malformed');
  end if;

  normalized_invite_code := pg_catalog.replace(normalized_invite_code, '-', '');

  select pg_catalog.btrim(name)
  into profile_display_name
  from public.users
  where id = current_user_id
  for update;

  if not found or exists(
    select 1 from public.space_members
    where user_id = current_user_id and is_active = true
  ) then
    update public.join_attempt_limits
    set failed_attempts = recent_failures || request_time,
      updated_at = request_time
    where user_id = current_user_id;

    return pg_catalog.jsonb_build_object('status', 'unavailable');
  end if;

  if p_redeem then
    if trimmed_display_name is null or trimmed_display_name = '' then
      trimmed_display_name := profile_display_name;
    elsif pg_catalog.char_length(trimmed_display_name) not between 2 and 100 then
      return pg_catalog.jsonb_build_object('status', 'invalid_name');
    end if;

    if trimmed_display_name is null
      or pg_catalog.char_length(trimmed_display_name) not between 2 and 100 then
      trimmed_display_name := fallback_display_name;
    end if;
  end if;

  if p_redeem then
    select * into matching_space
    from public.spaces
    where invite_code = normalized_invite_code
      and is_active = true
      and deleted_at is null
    for update;
  else
    select * into matching_space
    from public.spaces
    where invite_code = normalized_invite_code
      and is_active = true
      and deleted_at is null;
  end if;

  if matching_space.id is null
    or matching_space.invite_code_expires_at is null
    or matching_space.invite_code_expires_at <= pg_catalog.clock_timestamp()
    or not exists(
      select 1 from public.space_members
      where space_id = matching_space.id and role = 'owner' and is_active = true
    )
    or exists(
      select 1 from public.space_members
      where space_id = matching_space.id and role = 'partner' and is_active = true
    ) then
    update public.join_attempt_limits
    set failed_attempts = recent_failures || request_time,
      updated_at = request_time
    where user_id = current_user_id;

    return pg_catalog.jsonb_build_object('status', 'unavailable');
  end if;

  if not p_redeem then
    return pg_catalog.jsonb_build_object('status', 'valid');
  end if;

  insert into public.space_members (
    display_name,
    is_active,
    onboarding_completed_at,
    role,
    space_id,
    user_id
  )
  values (
    trimmed_display_name,
    true,
    pg_catalog.clock_timestamp(),
    'partner',
    matching_space.id,
    current_user_id
  );

  update public.spaces
  set invite_code = null,
    updated_by_user_id = current_user_id
  where id = matching_space.id;

  delete from public.join_attempt_limits where user_id = current_user_id;

  return pg_catalog.jsonb_build_object('status', 'joined', 'space_id', matching_space.id);
end;
$$;
