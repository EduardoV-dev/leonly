create type public.memory_creation_status as enum ('processing', 'completed', 'failed');

create table public.memory_creation_attempts (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.users(id) on delete restrict,
  space_id uuid not null references public.spaces(id) on delete restrict,
  idempotency_key uuid not null,
  request_fingerprint text not null,
  status public.memory_creation_status not null default 'processing',
  memory_id uuid references public.memories(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  cleanup_after timestamptz not null default timezone('utc', now()) + interval '1 day',

  constraint memory_creation_attempts_creator_key_unique unique (creator_user_id, idempotency_key),
  constraint memory_creation_attempts_completed_memory_check
    check ((status = 'completed') = (memory_id is not null))
);

create table public.memory_photo_staging (
  id uuid primary key,
  attempt_id uuid not null references public.memory_creation_attempts(id) on delete cascade,
  object_path text not null unique,
  position integer not null,
  uploaded_at timestamptz,
  cleaned_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),

  constraint memory_photo_staging_position_nonnegative_check check (position >= 0),
  constraint memory_photo_staging_attempt_position_unique unique (attempt_id, position)
);

create index memory_creation_attempts_cleanup_idx
on public.memory_creation_attempts (cleanup_after)
where status <> 'completed';

create trigger set_memory_creation_attempts_updated_at
before update on public.memory_creation_attempts
for each row
execute function public.set_updated_at();

revoke all on table public.memory_creation_attempts from public, anon, authenticated;
revoke all on table public.memory_photo_staging from public, anon, authenticated;

alter table public.memory_creation_attempts enable row level security;
alter table public.memory_photo_staging enable row level security;

create or replace function private.require_service_role()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'service role is required';
  end if;
end;
$$;

create or replace function private.available_space_for_user(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select member.space_id
  from public.space_members as member
  inner join public.spaces as space on space.id = member.space_id
  inner join public.users as profile on profile.id = member.user_id
  where member.user_id = p_user_id
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
  limit 1;
$$;

create or replace function public.reserve_memory_creation_attempt(
  p_creator_user_id uuid,
  p_idempotency_key uuid,
  p_request_fingerprint text
)
returns table (
  attempt_id uuid,
  is_new boolean,
  memory_id uuid,
  space_id uuid,
  status public.memory_creation_status
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_space_id uuid;
  v_attempt public.memory_creation_attempts;
  v_is_new boolean := false;
begin
  perform private.require_service_role();
  v_space_id := private.available_space_for_user(p_creator_user_id);

  if v_space_id is null then
    raise exception 'no available space';
  end if;

  insert into public.memory_creation_attempts (
    creator_user_id,
    space_id,
    idempotency_key,
    request_fingerprint
  )
  values (p_creator_user_id, v_space_id, p_idempotency_key, p_request_fingerprint)
  on conflict (creator_user_id, idempotency_key) do nothing
  returning id into v_attempt.id;

  v_is_new := v_attempt.id is not null;

  select * into v_attempt
  from public.memory_creation_attempts
  where creator_user_id = p_creator_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if v_attempt.request_fingerprint <> p_request_fingerprint then
    raise exception 'idempotency key input mismatch';
  end if;

  return query select v_attempt.id, v_is_new, v_attempt.memory_id, v_attempt.space_id, v_attempt.status;
end;
$$;

create or replace function public.stage_memory_photo(
  p_attempt_id uuid,
  p_photo_id uuid,
  p_position integer
)
returns table (object_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.memory_creation_attempts;
  v_object_path text;
begin
  perform private.require_service_role();

  select * into v_attempt
  from public.memory_creation_attempts
  where id = p_attempt_id
  for update;

  if not found or v_attempt.status <> 'processing' then
    raise exception 'creation attempt is unavailable';
  end if;

  v_object_path := v_attempt.space_id::text || '/' || p_attempt_id::text || '/' || p_photo_id::text;

  insert into public.memory_photo_staging (id, attempt_id, object_path, position)
  values (p_photo_id, p_attempt_id, v_object_path, p_position)
  on conflict (id) do nothing;

  return query select v_object_path;
end;
$$;

create or replace function public.mark_memory_photo_uploaded(p_photo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_service_role();

  update public.memory_photo_staging
  set uploaded_at = timezone('utc', now())
  where id = p_photo_id
    and uploaded_at is null;

  if not found then
    raise exception 'staged photo is unavailable';
  end if;
end;
$$;

create or replace function public.finalize_memory_creation_attempt(
  p_attempt_id uuid,
  p_title text,
  p_description text,
  p_location text,
  p_memory_date date,
  p_timezone text,
  p_visibility public.memory_visibility,
  p_cover_photo_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.memory_creation_attempts;
  v_memory_id uuid;
  v_photo_count integer;
begin
  perform private.require_service_role();

  select * into v_attempt
  from public.memory_creation_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'creation attempt is unavailable';
  end if;

  if v_attempt.status = 'completed' then
    return v_attempt.memory_id;
  end if;

  if v_attempt.status <> 'processing' then
    raise exception 'creation attempt failed';
  end if;

  if p_title is null or char_length(btrim(p_title)) not between 1 and 120
    or p_description is not null and char_length(btrim(p_description)) > 2000
    or p_location is not null and char_length(btrim(p_location)) > 150
    or not exists (select 1 from pg_timezone_names where name = p_timezone)
    or p_memory_date > (timezone(p_timezone, now()))::date then
    raise exception 'invalid memory details';
  end if;

  select count(*) into v_photo_count
  from public.memory_photo_staging
  where attempt_id = p_attempt_id
    and uploaded_at is not null;

  if v_photo_count <> (select count(*) from public.memory_photo_staging where attempt_id = p_attempt_id)
    or v_photo_count > 5
    or (v_photo_count = 0 and p_cover_photo_id is not null)
    or (v_photo_count > 0 and not exists (
      select 1 from public.memory_photo_staging where id = p_cover_photo_id and attempt_id = p_attempt_id
    )) then
    raise exception 'invalid staged photos';
  end if;

  insert into public.memories (
    space_id, creator_user_id, title, description, location, memory_date, visibility
  )
  values (
    v_attempt.space_id,
    v_attempt.creator_user_id,
    btrim(p_title),
    nullif(btrim(p_description), ''),
    nullif(btrim(p_location), ''),
    p_memory_date,
    p_visibility
  )
  returning id into v_memory_id;

  insert into public.memory_photos (id, memory_id, object_path, position)
  select id, v_memory_id, object_path, position
  from public.memory_photo_staging
  where attempt_id = p_attempt_id
  order by position;

  if p_cover_photo_id is not null then
    update public.memories
    set cover_photo_id = p_cover_photo_id
    where id = v_memory_id;
  end if;

  update public.memory_creation_attempts
  set status = 'completed', memory_id = v_memory_id
  where id = p_attempt_id;

  return v_memory_id;
end;
$$;

create or replace function public.fail_memory_creation_attempt(p_attempt_id uuid)
returns table (object_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_service_role();

  update public.memory_creation_attempts
  set status = 'failed', cleanup_after = timezone('utc', now())
  where id = p_attempt_id
    and status = 'processing';

  return query
  select staging.object_path
  from public.memory_photo_staging as staging
  where staging.attempt_id = p_attempt_id
    and staging.cleaned_at is null;
end;
$$;

create or replace function public.mark_memory_photo_staging_cleaned(p_object_paths text[])
returns void
language sql
security definer
set search_path = ''
as $$
  select private.require_service_role();

  update public.memory_photo_staging
  set cleaned_at = timezone('utc', now())
  where object_path = any(p_object_paths);
$$;

create or replace function public.list_stale_memory_photo_staging()
returns table (attempt_id uuid, object_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_service_role();

  update public.memory_creation_attempts
  set status = 'failed'
  where status = 'processing'
    and cleanup_after <= timezone('utc', now());

  return query
  select staging.attempt_id, staging.object_path
  from public.memory_photo_staging as staging
  inner join public.memory_creation_attempts as attempt on attempt.id = staging.attempt_id
  where attempt.status = 'failed'
    and staging.cleaned_at is null;
end;
$$;

revoke all on function private.require_service_role() from public, anon, authenticated;
revoke all on function private.available_space_for_user(uuid) from public, anon, authenticated;
revoke all on function public.reserve_memory_creation_attempt(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.stage_memory_photo(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.mark_memory_photo_uploaded(uuid) from public, anon, authenticated;
revoke all on function public.finalize_memory_creation_attempt(uuid, text, text, text, date, text, public.memory_visibility, uuid) from public, anon, authenticated;
revoke all on function public.fail_memory_creation_attempt(uuid) from public, anon, authenticated;
revoke all on function public.mark_memory_photo_staging_cleaned(text[]) from public, anon, authenticated;
revoke all on function public.list_stale_memory_photo_staging() from public, anon, authenticated;

grant execute on function public.reserve_memory_creation_attempt(uuid, uuid, text) to service_role;
grant execute on function public.stage_memory_photo(uuid, uuid, integer) to service_role;
grant execute on function public.mark_memory_photo_uploaded(uuid) to service_role;
grant execute on function public.finalize_memory_creation_attempt(uuid, text, text, text, date, text, public.memory_visibility, uuid) to service_role;
grant execute on function public.fail_memory_creation_attempt(uuid) to service_role;
grant execute on function public.mark_memory_photo_staging_cleaned(text[]) to service_role;
grant execute on function public.list_stale_memory_photo_staging() to service_role;
