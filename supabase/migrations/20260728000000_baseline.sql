create extension if not exists pgcrypto;

create type public.space_member_role as enum ('owner', 'partner');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint users_name_length_check
    check (char_length(btrim(name)) between 1 and 100),

  constraint users_email_not_blank_check
    check (char_length(btrim(email)) > 0)
);

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  invite_code text,
  invite_code_expires_at timestamptz,
  deleted_at timestamptz,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  updated_by_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint spaces_name_length_check
    check (char_length(btrim(name)) between 2 and 100),

  constraint spaces_invite_code_format_check
    check (
      invite_code is null
      or invite_code ~ '^(leo|lov|mem|our|duo|two|joy|sun|lny)[abcdefghjkmnpqrstuvwxyz23456789]{5}$'
    )
);

create table public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  display_name text not null,
  role public.space_member_role not null,
  deleted_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint space_members_display_name_length_check
    check (char_length(btrim(display_name)) between 2 and 100)
);

create table public.join_attempt_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failed_attempts timestamptz[] not null default '{}',
  locked_until timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),

  constraint join_attempt_limits_failed_attempts_check
    check (cardinality(failed_attempts) <= 5)
);

create unique index users_email_unique_idx
  on public.users (lower(email));

create unique index spaces_available_invite_code_unique_idx
  on public.spaces (invite_code)
  where deleted_at is null and invite_code is not null;

create index spaces_created_by_user_id_idx
  on public.spaces (created_by_user_id);

create index spaces_updated_by_user_id_idx
  on public.spaces (updated_by_user_id);

create index spaces_created_at_idx
  on public.spaces (created_at desc);

create unique index space_members_available_user_unique_idx
  on public.space_members (user_id)
  where deleted_at is null;

create unique index space_members_available_space_user_unique_idx
  on public.space_members (space_id, user_id)
  where deleted_at is null;

create unique index space_members_available_space_role_unique_idx
  on public.space_members (space_id, role)
  where deleted_at is null;

create index space_members_space_id_idx
  on public.space_members (space_id);

create index space_members_user_id_idx
  on public.space_members (user_id);

create index space_members_role_idx
  on public.space_members (role);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

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

create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

create trigger set_spaces_invite_code_expiry
before insert or update of invite_code on public.spaces
for each row
execute function public.set_invite_code_expiry();

create trigger set_spaces_updated_at
before update on public.spaces
for each row
execute function public.set_updated_at();

create trigger set_space_members_updated_at
before update on public.space_members
for each row
execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.join_attempt_limits enable row level security;

revoke all on table public.join_attempt_limits from public;
revoke all on table public.join_attempt_limits from anon;
revoke all on table public.join_attempt_limits from authenticated;

create policy "Users can view own profile"
on public.users
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can create own profile"
on public.users
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update own profile"
on public.users
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can view own membership"
on public.space_members
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and deleted_at is null
  and exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.deleted_at is null
  )
);

create policy "Members can view their spaces"
on public.spaces
for select
to authenticated
using (
  spaces.deleted_at is null
  and exists (
    select 1
    from public.space_members
    where space_members.space_id = spaces.id
      and space_members.user_id = (select auth.uid())
      and space_members.deleted_at is null
      and exists (
        select 1
        from public.users
        where users.id = (select auth.uid())
          and users.deleted_at is null
      )
  )
);

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
  profile_display_name text;
  fallback_display_name constant text := 'Leonly User';
  trimmed_display_name text := pg_catalog.btrim(p_display_name);
  trimmed_space_name text := pg_catalog.btrim(p_space_name);
begin
  if current_user_id is null then
    raise exception using errcode = 'L1001', message = 'Authentication is required.';
  end if;

  if trimmed_space_name is null or pg_catalog.char_length(trimmed_space_name) not between 2 and 100 then
    raise exception using errcode = 'L1002', message = 'Space name must contain 2 to 100 characters.';
  end if;

  if trimmed_display_name is not null
    and trimmed_display_name <> ''
    and pg_catalog.char_length(trimmed_display_name) not between 2 and 100 then
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

  select pg_catalog.btrim(name)
  into profile_display_name
  from public.users
  where id = current_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'L1004',
      message = 'The current user profile must exist before creating a space.';
  end if;

  if trimmed_display_name is null or trimmed_display_name = '' then
    trimmed_display_name := profile_display_name;
  end if;

  if trimmed_display_name is null
    or pg_catalog.char_length(trimmed_display_name) not between 2 and 100 then
    trimmed_display_name := fallback_display_name;
  end if;

  if exists(
    select 1
    from public.space_members
    where user_id = current_user_id
      and deleted_at is null
  ) then
    raise exception using errcode = 'L1003', message = 'You already belong to an active space.';
  end if;

  for attempt in 1..10 loop
    generated_invite_code := public.generate_space_invite_code();

    begin
      insert into public.spaces (
        created_by_user_id,
        invite_code,
        name,
        start_date,
        updated_by_user_id
      )
      values (
        current_user_id,
        generated_invite_code,
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
    onboarding_completed_at,
    role,
    space_id,
    user_id
  )
  values (
    trimmed_display_name,
    pg_catalog.clock_timestamp(),
    'owner',
    created_space.id,
    current_user_id
  );

  return pg_catalog.jsonb_build_object(
    'id', created_space.id,
    'invite_code', created_space.invite_code
  );
end;
$$;

revoke execute on function public.create_space(text, text, date, text) from public;
revoke execute on function public.create_space(text, text, date, text) from anon;
grant execute on function public.create_space(text, text, date, text) to authenticated;

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
        and member.deleted_at is null
        and profile.deleted_at is null
    ),
    'member_names', (
      select jsonb_agg(member.display_name order by member.role)
      from public.space_members member
      inner join public.users profile on profile.id = member.user_id
      where member.space_id = space.id
        and member.deleted_at is null
        and profile.deleted_at is null
    ),
    'name', space.name,
    'onboarding_completed_at', space_member.onboarding_completed_at,
    'start_date', space.start_date
  )
  from public.space_members space_member
  inner join public.spaces space on space.id = space_member.space_id
  inner join public.users profile on profile.id = space_member.user_id
  where space_member.user_id = auth.uid()
    and space_member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
  limit 1;
$$;

revoke execute on function public.get_active_space() from public;
revoke execute on function public.get_active_space() from anon;
grant execute on function public.get_active_space() to authenticated;

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
    and deleted_at is null
  for update;

  if not found or exists(
    select 1
    from public.space_members
    where user_id = current_user_id
      and deleted_at is null
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
      and deleted_at is null
    for update;
  else
    select * into matching_space
    from public.spaces
    where invite_code = normalized_invite_code
      and deleted_at is null;
  end if;

  if matching_space.id is null
    or matching_space.invite_code_expires_at is null
    or matching_space.invite_code_expires_at <= pg_catalog.clock_timestamp()
    or not exists(
      select 1
      from public.space_members as member
      inner join public.users profile on profile.id = member.user_id
      where member.space_id = matching_space.id
        and member.role = 'owner'
        and member.deleted_at is null
        and profile.deleted_at is null
    )
    or exists(
      select 1
      from public.space_members as member
      inner join public.users profile on profile.id = member.user_id
      where member.space_id = matching_space.id
        and member.role = 'partner'
        and member.deleted_at is null
        and profile.deleted_at is null
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
    onboarding_completed_at,
    role,
    space_id,
    user_id
  )
  values (
    trimmed_display_name,
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
  inner join public.users profile on profile.id = member.user_id
  where member.user_id = current_user_id
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
  for update of space;

  if matching_space.id is null
    or (
      matching_space.invite_code is not null
      and matching_space.invite_code_expires_at > pg_catalog.clock_timestamp()
    )
    or (
      select pg_catalog.count(*)
      from public.space_members as member
      inner join public.users profile on profile.id = member.user_id
      where member.space_id = matching_space.id
        and member.deleted_at is null
        and profile.deleted_at is null
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
    and space_member.deleted_at is null
    and space.deleted_at is null
    and exists (
      select 1
      from public.users profile
      where profile.id = current_user_id
        and profile.deleted_at is null
    );

  if not found then
    raise exception using errcode = 'L1006', message = 'You do not belong to an active space.';
  end if;
end;
$$;

revoke execute on function public.complete_space_setup() from public;
revoke execute on function public.complete_space_setup() from anon;
grant execute on function public.complete_space_setup() to authenticated;
