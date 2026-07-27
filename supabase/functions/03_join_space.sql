drop function if exists public.find_joinable_space(text);
drop function if exists public.join_space(text, text);

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

  if p_redeem and (
    trimmed_display_name is null
    or pg_catalog.char_length(trimmed_display_name) not between 2 and 100
  ) then
    return pg_catalog.jsonb_build_object('status', 'invalid_name');
  end if;

  perform 1
  from public.users
  where id = current_user_id
  for update;

  if not found or exists(
    select 1
    from public.space_members
    where user_id = current_user_id
      and is_active = true
  ) then
    update public.join_attempt_limits
    set failed_attempts = recent_failures || request_time,
      updated_at = request_time
    where user_id = current_user_id;

    return pg_catalog.jsonb_build_object('status', 'unavailable');
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
      select 1
      from public.space_members
      where space_id = matching_space.id
        and role = 'owner'
        and is_active = true
    )
    or exists(
      select 1
      from public.space_members
      where space_id = matching_space.id
        and role = 'partner'
        and is_active = true
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

  delete from public.join_attempt_limits
  where user_id = current_user_id;

  return pg_catalog.jsonb_build_object('status', 'joined', 'space_id', matching_space.id);
end;
$$;

create or replace function public.regenerate_space_invite()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  generated_invite_code text;
  matching_space public.spaces%rowtype;
begin
  if current_user_id is null then
    raise exception using errcode = 'L1001', message = 'Authentication is required.';
  end if;

  select space.* into matching_space
  from public.space_members member
  inner join public.spaces space on space.id = member.space_id
  where member.user_id = current_user_id
    and member.is_active = true
    and space.is_active = true
    and space.deleted_at is null
  for update of space;

  if matching_space.id is null
    or (
      matching_space.invite_code is not null
      and matching_space.invite_code_expires_at > pg_catalog.clock_timestamp()
    )
    or (
      select pg_catalog.count(*)
      from public.space_members
      where space_id = matching_space.id
        and is_active = true
    ) <> 1 then
    return pg_catalog.jsonb_build_object('status', 'unavailable');
  end if;

  for attempt in 1..10 loop
    generated_invite_code := public.generate_space_invite_code();

    begin
      update public.spaces
      set invite_code = generated_invite_code,
        updated_by_user_id = current_user_id
      where id = matching_space.id
      returning * into matching_space;

      exit;
    exception
      when unique_violation then
        if attempt = 10 then
          raise exception using
            errcode = 'L1005',
            message = 'We could not generate a unique invite code. Please try again.';
        end if;
    end;
  end loop;

  return pg_catalog.jsonb_build_object(
    'status', 'regenerated',
    'invite_code', matching_space.invite_code,
    'invite_code_expires_at', matching_space.invite_code_expires_at
  );
end;
$$;

revoke execute on function public.process_space_invite(text, text, boolean) from public;
revoke execute on function public.process_space_invite(text, text, boolean) from anon;
grant execute on function public.process_space_invite(text, text, boolean) to authenticated;

revoke execute on function public.regenerate_space_invite() from public;
revoke execute on function public.regenerate_space_invite() from anon;
grant execute on function public.regenerate_space_invite() to authenticated;
