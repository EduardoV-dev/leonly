create type public.memory_edit_status as enum ('processing', 'completed', 'failed');

create unique index memory_photos_object_path_unique
on public.memory_photos (object_path);

create table public.memory_edit_attempts (
  id uuid primary key default gen_random_uuid(),
  editor_user_id uuid not null references public.users(id) on delete restrict,
  space_id uuid not null references public.spaces(id) on delete restrict,
  memory_id uuid not null references public.memories(id) on delete restrict,
  idempotency_key uuid not null,
  request_fingerprint text not null,
  expected_updated_at timestamptz not null,
  status public.memory_edit_status not null default 'processing',
  outcome text not null default 'processing',
  result_visibility public.memory_visibility,
  result_updated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  cleanup_after timestamptz not null default timezone('utc', now()) + interval '1 day',

  constraint memory_edit_attempts_editor_key_unique unique (editor_user_id, idempotency_key),
  constraint memory_edit_attempts_fingerprint_not_blank_check
    check (char_length(btrim(request_fingerprint)) > 0),
  constraint memory_edit_attempts_outcome_check
    check (outcome in ('processing', 'completed', 'conflict', 'unavailable', 'invalid', 'failed')),
  constraint memory_edit_attempts_status_outcome_check
    check (
      (status = 'processing' and outcome = 'processing')
      or (status = 'completed' and outcome = 'completed')
      or (status = 'failed' and outcome in ('conflict', 'unavailable', 'invalid', 'failed'))
    ),
  constraint memory_edit_attempts_completed_result_check
    check (
      (status = 'completed') = (result_visibility is not null and result_updated_at is not null)
    )
);

create table public.memory_edit_photo_staging (
  id uuid primary key,
  attempt_id uuid not null references public.memory_edit_attempts(id) on delete cascade,
  object_path text not null unique,
  cover_object_path text not null unique,
  detail_object_path text not null unique,
  position integer not null,
  uploaded_at timestamptz,
  cleaned_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),

  constraint memory_edit_photo_staging_paths_not_blank_check
    check (
      char_length(btrim(object_path)) > 0
      and char_length(btrim(cover_object_path)) > 0
      and char_length(btrim(detail_object_path)) > 0
    ),
  constraint memory_edit_photo_staging_position_check check (position between 0 and 4),
  constraint memory_edit_photo_staging_attempt_position_unique unique (attempt_id, position)
);

create table public.memory_photo_cleanup (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references public.memory_edit_attempts(id) on delete restrict,
  object_path text not null unique,
  cleanup_after timestamptz not null default timezone('utc', now()),
  cleaned_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),

  constraint memory_photo_cleanup_object_path_not_blank_check
    check (char_length(btrim(object_path)) > 0)
);

create index memory_edit_attempts_cleanup_idx
on public.memory_edit_attempts (cleanup_after)
where status <> 'completed';

create index memory_edit_photo_staging_cleanup_idx
on public.memory_edit_photo_staging (attempt_id)
where cleaned_at is null;

create index memory_photo_cleanup_pending_idx
on public.memory_photo_cleanup (cleanup_after, id)
where cleaned_at is null;

create trigger set_memory_edit_attempts_updated_at
before update on public.memory_edit_attempts
for each row execute function public.set_updated_at();

revoke all on table public.memory_edit_attempts from public, anon, authenticated;
revoke all on table public.memory_edit_photo_staging from public, anon, authenticated;
revoke all on table public.memory_photo_cleanup from public, anon, authenticated;

alter table public.memory_edit_attempts enable row level security;
alter table public.memory_edit_photo_staging enable row level security;
alter table public.memory_photo_cleanup enable row level security;

create or replace function public.reserve_memory_edit_attempt(
  p_editor_user_id uuid,
  p_memory_id uuid,
  p_idempotency_key uuid,
  p_request_fingerprint text,
  p_expected_updated_at timestamptz
)
returns table (
  attempt_id uuid,
  is_new boolean,
  memory_id uuid,
  outcome text,
  result_visibility public.memory_visibility,
  result_updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_space_id uuid;
  v_memory public.memories;
  v_attempt public.memory_edit_attempts;
  v_is_new boolean := false;
  v_inserted_count integer;
begin
  perform private.require_service_role();

  select * into v_attempt
  from public.memory_edit_attempts as attempt
  where attempt.editor_user_id = p_editor_user_id
    and attempt.idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_attempt.memory_id <> p_memory_id
      or v_attempt.request_fingerprint <> p_request_fingerprint
      or v_attempt.expected_updated_at <> p_expected_updated_at then
      return query select null::uuid, false, null::uuid, 'mismatch'::text,
        null::public.memory_visibility, null::timestamptz;
      return;
    end if;

    if v_attempt.status = 'failed' and v_attempt.outcome = 'failed' and not exists (
      select 1 from public.memory_edit_photo_staging as staging
      where staging.attempt_id = v_attempt.id and staging.cleaned_at is null
    ) then
      delete from public.memory_edit_photo_staging as staging
      where staging.attempt_id = v_attempt.id;
      update public.memory_edit_attempts
      set status = 'processing', outcome = 'processing',
        cleanup_after = timezone('utc', now()) + interval '1 day'
      where id = v_attempt.id
      returning * into v_attempt;
      v_is_new := true;
    end if;

    return query select v_attempt.id, v_is_new, v_attempt.memory_id, v_attempt.outcome,
      v_attempt.result_visibility, v_attempt.result_updated_at;
    return;
  end if;

  v_space_id := private.available_space_for_user(p_editor_user_id);
  if v_space_id is null then
    return query select null::uuid, false, null::uuid, 'unavailable'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  select * into v_memory
  from public.memories as memory
  where memory.id = p_memory_id
    and memory.space_id = v_space_id
    and memory.deleted_at is null;

  if not found then
    return query select null::uuid, false, null::uuid, 'unavailable'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  insert into public.memory_edit_attempts (
    editor_user_id, space_id, memory_id, idempotency_key, request_fingerprint,
    expected_updated_at, status, outcome
  ) values (
    p_editor_user_id, v_space_id, p_memory_id, p_idempotency_key, p_request_fingerprint,
    p_expected_updated_at,
    case
      when v_memory.updated_at = p_expected_updated_at
        then 'processing'::public.memory_edit_status
      else 'failed'::public.memory_edit_status
    end,
    case when v_memory.updated_at = p_expected_updated_at then 'processing' else 'conflict' end
  )
  on conflict (editor_user_id, idempotency_key) do nothing;
  get diagnostics v_inserted_count = row_count;
  v_is_new := v_inserted_count = 1;

  select * into v_attempt
  from public.memory_edit_attempts as attempt
  where attempt.editor_user_id = p_editor_user_id
    and attempt.idempotency_key = p_idempotency_key
  for update;

  if v_attempt.memory_id <> p_memory_id
    or v_attempt.request_fingerprint <> p_request_fingerprint
    or v_attempt.expected_updated_at <> p_expected_updated_at then
    return query select null::uuid, false, null::uuid, 'mismatch'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  return query select v_attempt.id, v_is_new, v_attempt.memory_id, v_attempt.outcome,
    v_attempt.result_visibility, v_attempt.result_updated_at;
end;
$$;

create or replace function public.stage_memory_edit_photo_variants(
  p_attempt_id uuid,
  p_photo_id uuid,
  p_position integer
)
returns table (object_path text, cover_object_path text, detail_object_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.memory_edit_attempts;
  v_base_path text;
begin
  perform private.require_service_role();
  select * into v_attempt from public.memory_edit_attempts where id = p_attempt_id for update;
  if not found or v_attempt.status <> 'processing' or p_position not between 0 and 4 then
    raise exception 'edit attempt is unavailable';
  end if;

  v_base_path := v_attempt.space_id::text || '/edits/' || p_attempt_id::text || '/' || p_photo_id::text;
  insert into public.memory_edit_photo_staging (
    id, attempt_id, object_path, cover_object_path, detail_object_path, position
  ) values (
    p_photo_id, p_attempt_id, v_base_path || '/original', v_base_path || '/cover.webp',
    v_base_path || '/detail.webp', p_position
  );

  return query
  select staging.object_path, staging.cover_object_path, staging.detail_object_path
  from public.memory_edit_photo_staging as staging
  where staging.id = p_photo_id and staging.attempt_id = p_attempt_id;
end;
$$;

create or replace function public.mark_memory_edit_photo_uploaded(
  p_attempt_id uuid,
  p_photo_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_service_role();
  update public.memory_edit_photo_staging as staging
  set uploaded_at = timezone('utc', now())
  from public.memory_edit_attempts as attempt
  where staging.id = p_photo_id
    and staging.attempt_id = p_attempt_id
    and attempt.id = staging.attempt_id
    and attempt.status = 'processing'
    and staging.uploaded_at is null;
  if not found then
    raise exception 'staged edit photo is unavailable';
  end if;
end;
$$;

create or replace function public.finalize_memory_edit_attempt(
  p_attempt_id uuid,
  p_title text,
  p_description text,
  p_location text,
  p_memory_date date,
  p_timezone text,
  p_visibility public.memory_visibility,
  p_retained_photo_ids uuid[],
  p_cover_photo_id uuid
)
returns table (
  memory_id uuid,
  outcome text,
  result_visibility public.memory_visibility,
  result_updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.memory_edit_attempts;
  v_memory public.memories;
  v_retained_count integer;
  v_staged_count integer;
  v_result_updated_at timestamptz;
begin
  perform private.require_service_role();
  select * into v_attempt from public.memory_edit_attempts where id = p_attempt_id for update;
  if not found then
    return query select null::uuid, 'unavailable'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;
  if v_attempt.status = 'completed' then
    return query select v_attempt.memory_id, v_attempt.outcome,
      v_attempt.result_visibility, v_attempt.result_updated_at;
    return;
  end if;
  if v_attempt.status <> 'processing' then
    return query select v_attempt.memory_id, v_attempt.outcome,
      v_attempt.result_visibility, v_attempt.result_updated_at;
    return;
  end if;

  if private.available_space_for_user(v_attempt.editor_user_id) is distinct from v_attempt.space_id then
    update public.memory_edit_attempts set status = 'failed', outcome = 'unavailable'
    where id = p_attempt_id;
    return query select v_attempt.memory_id, 'unavailable'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  select * into v_memory
  from public.memories as memory
  where memory.id = v_attempt.memory_id
    and memory.space_id = v_attempt.space_id
    and memory.deleted_at is null
  for update;
  if not found then
    update public.memory_edit_attempts set status = 'failed', outcome = 'unavailable'
    where id = p_attempt_id;
    return query select v_attempt.memory_id, 'unavailable'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;
  if v_memory.updated_at <> v_attempt.expected_updated_at then
    update public.memory_edit_attempts set status = 'failed', outcome = 'conflict'
    where id = p_attempt_id;
    return query select v_attempt.memory_id, 'conflict'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  if p_title is null or char_length(btrim(p_title)) not between 1 and 120
    or p_description is not null and char_length(btrim(p_description)) > 2000
    or p_location is not null and char_length(btrim(p_location)) > 150
    or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
    or p_memory_date > (timezone(p_timezone, now()))::date
    or coalesce(cardinality(p_retained_photo_ids), 0) <> (
      select count(distinct retained_id) from unnest(coalesce(p_retained_photo_ids, array[]::uuid[]))
        as retained_id
    ) then
    update public.memory_edit_attempts set status = 'failed', outcome = 'invalid'
    where id = p_attempt_id;
    return query select v_attempt.memory_id, 'invalid'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  select count(*) into v_retained_count
  from public.memory_photos as photo
  where photo.memory_id = v_attempt.memory_id
    and photo.id = any(coalesce(p_retained_photo_ids, array[]::uuid[]));
  select count(*) into v_staged_count
  from public.memory_edit_photo_staging as staging
  where staging.attempt_id = p_attempt_id and staging.uploaded_at is not null;

  if v_retained_count <> coalesce(cardinality(p_retained_photo_ids), 0)
    or v_staged_count <> (
      select count(*) from public.memory_edit_photo_staging where attempt_id = p_attempt_id
    )
    or v_retained_count + v_staged_count > 5
    or (v_retained_count + v_staged_count = 0 and p_cover_photo_id is not null)
    or (v_retained_count + v_staged_count > 0 and not (
      exists (
        select 1 from public.memory_photos as retained_cover
        where retained_cover.memory_id = v_attempt.memory_id
          and retained_cover.id = p_cover_photo_id
          and retained_cover.id = any(coalesce(p_retained_photo_ids, array[]::uuid[]))
      )
      or exists (
        select 1 from public.memory_edit_photo_staging
        where attempt_id = p_attempt_id and id = p_cover_photo_id and uploaded_at is not null
      )
    )) then
    update public.memory_edit_attempts set status = 'failed', outcome = 'invalid'
    where id = p_attempt_id;
    return query select v_attempt.memory_id, 'invalid'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  insert into public.memory_photo_cleanup (attempt_id, object_path)
  select p_attempt_id, path.object_path
  from public.memory_photos as photo
  cross join lateral (
    values (photo.object_path), (photo.cover_object_path), (photo.detail_object_path)
  ) as path(object_path)
  where photo.memory_id = v_attempt.memory_id
    and not (photo.id = any(coalesce(p_retained_photo_ids, array[]::uuid[])))
    and path.object_path is not null
  on conflict (object_path) do nothing;

  update public.memories set cover_photo_id = null where id = v_attempt.memory_id;
  delete from public.memory_photos as removed_photo
  where removed_photo.memory_id = v_attempt.memory_id
    and not (removed_photo.id = any(coalesce(p_retained_photo_ids, array[]::uuid[])));

  update public.memory_photos as shifted_photo
  set position = shifted_photo.position + 100
  where shifted_photo.memory_id = v_attempt.memory_id;
  with retained_positions as (
    select id, row_number() over (order by position) - 1 as final_position
    from public.memory_photos as retained_photo
    where retained_photo.memory_id = v_attempt.memory_id
  )
  update public.memory_photos as photo
  set position = retained.final_position
  from retained_positions as retained
  where photo.id = retained.id;

  insert into public.memory_photos (
    id, memory_id, object_path, cover_object_path, detail_object_path, position
  )
  select staging.id, v_attempt.memory_id, staging.object_path, staging.cover_object_path,
    staging.detail_object_path, v_retained_count + staging.position
  from public.memory_edit_photo_staging as staging
  where staging.attempt_id = p_attempt_id
  order by staging.position;

  update public.memories
  set title = btrim(p_title), description = nullif(btrim(p_description), ''),
    location = nullif(btrim(p_location), ''), memory_date = p_memory_date,
    visibility = p_visibility, cover_photo_id = p_cover_photo_id
  where id = v_attempt.memory_id
  returning updated_at into v_result_updated_at;

  update public.memory_edit_attempts
  set status = 'completed', outcome = 'completed', result_visibility = p_visibility,
    result_updated_at = v_result_updated_at
  where id = p_attempt_id;

  return query select v_attempt.memory_id, 'completed'::text, p_visibility, v_result_updated_at;
end;
$$;

create or replace function public.fail_memory_edit_attempt(p_attempt_id uuid)
returns table (object_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_service_role();
  update public.memory_edit_attempts
  set status = 'failed', outcome = 'failed', cleanup_after = timezone('utc', now())
  where id = p_attempt_id and status = 'processing';

  return query
  select path.object_path
  from public.memory_edit_photo_staging as staging
  inner join public.memory_edit_attempts as attempt on attempt.id = staging.attempt_id
  cross join lateral (
    values (staging.object_path), (staging.cover_object_path), (staging.detail_object_path)
  ) as path(object_path)
  where staging.attempt_id = p_attempt_id
    and attempt.status = 'failed'
    and staging.cleaned_at is null;
end;
$$;

create or replace function public.mark_memory_edit_staging_cleaned(p_object_paths text[])
returns void
language sql
security definer
set search_path = ''
as $$
  select private.require_service_role();
  update public.memory_edit_photo_staging
  set cleaned_at = timezone('utc', now())
  where object_path = any(p_object_paths)
    or cover_object_path = any(p_object_paths)
    or detail_object_path = any(p_object_paths);
$$;

create or replace function public.list_stale_memory_edit_staging()
returns table (attempt_id uuid, object_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_service_role();
  update public.memory_edit_attempts
  set status = 'failed', outcome = 'failed'
  where status = 'processing' and cleanup_after <= timezone('utc', now());

  return query
  select staging.attempt_id, path.object_path
  from public.memory_edit_photo_staging as staging
  inner join public.memory_edit_attempts as attempt on attempt.id = staging.attempt_id
  cross join lateral (
    values (staging.object_path), (staging.cover_object_path), (staging.detail_object_path)
  ) as path(object_path)
  where attempt.status = 'failed' and attempt.outcome = 'failed' and staging.cleaned_at is null;
end;
$$;

create or replace function public.list_memory_photo_cleanup()
returns table (object_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_service_role();
  return query
  select cleanup.object_path from public.memory_photo_cleanup as cleanup
  where cleanup.cleaned_at is null and cleanup.cleanup_after <= timezone('utc', now())
    and not exists (
      select 1 from public.memory_photos as photo
      where cleanup.object_path in (
        photo.object_path,
        photo.cover_object_path,
        photo.detail_object_path
      )
    )
  order by cleanup.id limit 500;
end;
$$;

create or replace function public.mark_memory_photo_cleanup_completed(p_object_paths text[])
returns void
language sql
security definer
set search_path = ''
as $$
  select private.require_service_role();
  update public.memory_photo_cleanup set cleaned_at = timezone('utc', now())
  where object_path = any(p_object_paths) and cleaned_at is null;
$$;

revoke all on function public.reserve_memory_edit_attempt(uuid, uuid, uuid, text, timestamptz)
from public, anon, authenticated;
revoke all on function public.stage_memory_edit_photo_variants(uuid, uuid, integer)
from public, anon, authenticated;
revoke all on function public.mark_memory_edit_photo_uploaded(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.finalize_memory_edit_attempt(
  uuid, text, text, text, date, text, public.memory_visibility, uuid[], uuid
) from public, anon, authenticated;
revoke all on function public.fail_memory_edit_attempt(uuid) from public, anon, authenticated;
revoke all on function public.mark_memory_edit_staging_cleaned(text[])
from public, anon, authenticated;
revoke all on function public.list_stale_memory_edit_staging() from public, anon, authenticated;
revoke all on function public.list_memory_photo_cleanup() from public, anon, authenticated;
revoke all on function public.mark_memory_photo_cleanup_completed(text[])
from public, anon, authenticated;

grant execute on function public.reserve_memory_edit_attempt(uuid, uuid, uuid, text, timestamptz)
to service_role;
grant execute on function public.stage_memory_edit_photo_variants(uuid, uuid, integer)
to service_role;
grant execute on function public.mark_memory_edit_photo_uploaded(uuid, uuid) to service_role;
grant execute on function public.finalize_memory_edit_attempt(
  uuid, text, text, text, date, text, public.memory_visibility, uuid[], uuid
) to service_role;
grant execute on function public.fail_memory_edit_attempt(uuid) to service_role;
grant execute on function public.mark_memory_edit_staging_cleaned(text[]) to service_role;
grant execute on function public.list_stale_memory_edit_staging() to service_role;
grant execute on function public.list_memory_photo_cleanup() to service_role;
grant execute on function public.mark_memory_photo_cleanup_completed(text[]) to service_role;
