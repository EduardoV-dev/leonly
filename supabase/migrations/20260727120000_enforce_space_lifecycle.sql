alter table public.spaces
add column if not exists deleted_at timestamptz;

lock table public.spaces in share row exclusive mode;
lock table public.space_members in share row exclusive mode;

do $$
begin
  if exists(
    select 1
    from public.space_members
    where is_active = true
    group by space_id, role
    having count(*) > 1
  ) then
    raise exception 'US-001 migration blocked: duplicate active membership roles exist.';
  end if;

  if exists(
    select 1
    from public.space_members member
    inner join public.spaces space on space.id = member.space_id
    where member.is_active = true
      and (space.is_active = false or space.deleted_at is not null)
  ) then
    raise exception 'US-001 migration blocked: active memberships reference unavailable spaces.';
  end if;
end;
$$;

alter table public.spaces
drop constraint if exists spaces_invite_code_format_check;

alter table public.spaces
add constraint spaces_invite_code_format_check
check (
  invite_code is null
  or invite_code ~ '^(leo|lov|mem|our|duo|two|joy|sun|lny)[abcdefghjkmnpqrstuvwxyz23456789]{5}$'
);

drop index if exists public.spaces_active_invite_code_unique_idx;
create unique index spaces_active_invite_code_unique_idx
on public.spaces (invite_code)
where is_active = true and deleted_at is null and invite_code is not null;

create unique index if not exists space_members_active_space_role_unique_idx
on public.space_members (space_id, role)
where is_active = true;

create table if not exists public.join_attempt_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failed_attempts timestamptz[] not null default '{}',
  locked_until timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint join_attempt_limits_failed_attempts_check
    check (cardinality(failed_attempts) <= 5)
);

alter table public.join_attempt_limits enable row level security;
revoke all on table public.join_attempt_limits from public;
revoke all on table public.join_attempt_limits from anon;
revoke all on table public.join_attempt_limits from authenticated;

drop policy if exists "Members can view their spaces" on public.spaces;
create policy "Members can view their spaces"
on public.spaces
for select
to authenticated
using (
  spaces.is_active
  and spaces.deleted_at is null
  and exists (
    select 1
    from public.space_members
    where space_members.space_id = spaces.id
      and space_members.user_id = (select auth.uid())
      and space_members.is_active
  )
);

create or replace function public.set_invite_code_expiry()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.invite_code is null then
    new.invite_code_expires_at := null;
  elsif tg_op = 'INSERT' or new.invite_code is distinct from old.invite_code then
    new.invite_code_expires_at := clock_timestamp() + interval '24 hours';
  end if;

  return new;
end;
$$;

create or replace function public.generate_space_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  invite_alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  invite_prefixes constant text[] := array['leo', 'lov', 'mem', 'our', 'duo', 'two', 'joy', 'sun', 'lny'];
  random_bytes bytea := pg_catalog.uuid_send(pg_catalog.gen_random_uuid());
  generated_code text;
begin
  generated_code := invite_prefixes[
    1 + (pg_catalog.get_byte(random_bytes, 0) % pg_catalog.cardinality(invite_prefixes))
  ];

  for byte_index in 1..5 loop
    generated_code := generated_code || pg_catalog.substr(
      invite_alphabet,
      1 + (pg_catalog.get_byte(random_bytes, byte_index) % pg_catalog.length(invite_alphabet)),
      1
    );
  end loop;

  return generated_code;
end;
$$;

revoke execute on function public.generate_space_invite_code() from public;
revoke execute on function public.generate_space_invite_code() from anon;
revoke execute on function public.generate_space_invite_code() from authenticated;

create or replace function public.create_space(
  p_space_name text,
  p_display_name text,
  p_start_date date,
  p_timezone text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_space public.spaces%rowtype;
  generated_invite_code text;
  trimmed_display_name text := pg_catalog.btrim(p_display_name);
  trimmed_space_name text := pg_catalog.btrim(p_space_name);
begin
  if current_user_id is null then
    raise exception using errcode = 'L1001', message = 'Authentication is required.';
  end if;

  if trimmed_space_name is null or pg_catalog.char_length(trimmed_space_name) not between 2 and 100 then
    raise exception using errcode = 'L1002', message = 'Space name must contain 2 to 100 characters.';
  end if;

  if trimmed_display_name is null
    or pg_catalog.char_length(trimmed_display_name) not between 2 and 100 then
    raise exception using errcode = 'L1002', message = 'Your name must contain 2 to 100 characters.';
  end if;

  if p_start_date is null then
    raise exception using errcode = 'L1002', message = 'Start date is required.';
  end if;

  if p_timezone is null or not exists(
    select 1 from pg_catalog.pg_timezone_names where name = p_timezone
  ) then
    raise exception using errcode = 'L1002', message = 'Enter a valid timezone.';
  end if;

  if p_start_date > (current_timestamp at time zone p_timezone)::date then
    raise exception using errcode = 'L1002', message = 'The start date cannot be in the future.';
  end if;

  perform 1 from public.users where id = current_user_id for update;

  if not found then
    raise exception using
      errcode = 'L1004',
      message = 'The current user profile must exist before creating a space.';
  end if;

  if exists(
    select 1 from public.space_members
    where user_id = current_user_id and is_active = true
  ) then
    raise exception using errcode = 'L1003', message = 'You already belong to an active space.';
  end if;

  for attempt in 1..10 loop
    generated_invite_code := public.generate_space_invite_code();

    begin
      insert into public.spaces (
        created_by_user_id,
        invite_code,
        is_active,
        name,
        start_date,
        updated_by_user_id
      )
      values (
        current_user_id,
        generated_invite_code,
        true,
        trimmed_space_name,
        p_start_date,
        current_user_id
      )
      returning * into created_space;

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
    'owner',
    created_space.id,
    current_user_id
  );

  return pg_catalog.jsonb_build_object('id', created_space.id, 'invite_code', created_space.invite_code);
end;
$$;

revoke execute on function public.create_space(text, text, date, text) from public;
revoke execute on function public.create_space(text, text, date, text) from anon;
grant execute on function public.create_space(text, text, date, text) to authenticated;

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

  perform 1 from public.users where id = current_user_id for update;

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
      select pg_catalog.count(*) from public.space_members
      where space_id = matching_space.id and is_active = true
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
          jsonb_build_object('avatar_url', profile.avatar_url, 'display_name', member.display_name)
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
      where member.space_id = space.id and member.is_active = true
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
    and space.deleted_at is null
  limit 1;
$$;

revoke execute on function public.get_active_space() from public;
revoke execute on function public.get_active_space() from anon;
grant execute on function public.get_active_space() to authenticated;

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
    raise exception using errcode = 'L1001', message = 'Authentication is required.';
  end if;

  update public.space_members space_member
  set onboarding_completed_at = coalesce(space_member.onboarding_completed_at, timezone('utc', now()))
  from public.spaces space
  where space_member.space_id = space.id
    and space_member.user_id = current_user_id
    and space_member.is_active = true
    and space.is_active = true
    and space.deleted_at is null;

  if not found then
    raise exception using errcode = 'L1006', message = 'You do not belong to an active space.';
  end if;
end;
$$;
