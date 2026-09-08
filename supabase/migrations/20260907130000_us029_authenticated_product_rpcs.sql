alter function public.get_active_space() set search_path = '';
alter function public.complete_space_setup() set search_path = '';

create or replace function private.active_membership()
returns public.space_members
language sql
stable
security definer
set search_path = ''
as $$
  select member
  from public.space_members as member
  inner join public.spaces as space on space.id = member.space_id
  inner join public.users as profile on profile.id = member.user_id
  where member.user_id = (select auth.uid())
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
  limit 1;
$$;

revoke all on function private.active_membership()
from public, anon, authenticated, service_role;

create function public.reserve_memory_creation_attempt(
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
  v_membership public.space_members;
  v_attempt public.memory_creation_attempts;
  v_is_new boolean := false;
begin
  v_membership := private.active_membership();
  if v_membership.id is null then
    raise exception 'no available space';
  end if;

  insert into public.memory_creation_attempts (
    creator_membership_id,
    creator_user_id,
    space_id,
    idempotency_key,
    request_fingerprint
  )
  values (
    v_membership.id,
    (select auth.uid()),
    v_membership.space_id,
    p_idempotency_key,
    p_request_fingerprint
  )
  on conflict (creator_user_id, idempotency_key) do nothing
  returning * into v_attempt;

  v_is_new := v_attempt.id is not null;

  select * into v_attempt
  from public.memory_creation_attempts as attempt
  where attempt.creator_user_id = (select auth.uid())
    and attempt.idempotency_key = p_idempotency_key
  for update of attempt;

  if v_attempt.request_fingerprint <> p_request_fingerprint then
    raise exception 'idempotency key input mismatch';
  end if;
  if v_attempt.creator_membership_id <> v_membership.id
    or v_attempt.space_id <> v_membership.space_id then
    raise exception 'creation attempt is unavailable';
  end if;

  return query
  select v_attempt.id, v_is_new, v_attempt.memory_id, v_attempt.space_id, v_attempt.status;
end;
$$;

create or replace function public.stage_memory_photo_variants(
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
  v_attempt public.memory_creation_attempts;
  v_base_path text;
begin
  select attempt.* into v_attempt
  from public.memory_creation_attempts as attempt
  inner join public.space_members as member on member.id = attempt.creator_membership_id
  inner join public.spaces as space on space.id = attempt.space_id
  inner join public.users as profile on profile.id = member.user_id
  where attempt.id = p_attempt_id
    and attempt.creator_user_id = (select auth.uid())
    and attempt.status = 'processing'
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
  for update of attempt;

  if not found or p_position not between 0 and 9 then
    raise exception 'creation attempt is unavailable';
  end if;

  v_base_path := v_attempt.space_id::text || '/' || p_attempt_id::text || '/' || p_photo_id::text;

  insert into public.memory_photo_staging (
    id, attempt_id, object_path, cover_object_path, detail_object_path, position
  )
  values (
    p_photo_id,
    p_attempt_id,
    v_base_path || '/original',
    v_base_path || '/cover.webp',
    v_base_path || '/detail.webp',
    p_position
  )
  on conflict (id) do nothing;

  return query
  select staging.object_path, staging.cover_object_path, staging.detail_object_path
  from public.memory_photo_staging as staging
  where staging.id = p_photo_id
    and staging.attempt_id = p_attempt_id;
end;
$$;

create or replace function public.mark_memory_photo_uploaded(p_photo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.memory_photo_staging as staging
  set uploaded_at = pg_catalog.timezone('utc', pg_catalog.now())
  from public.memory_creation_attempts as attempt
  inner join public.space_members as member on member.id = attempt.creator_membership_id
  inner join public.spaces as space on space.id = attempt.space_id
  inner join public.users as profile on profile.id = member.user_id
  where staging.id = p_photo_id
    and attempt.id = staging.attempt_id
    and attempt.creator_user_id = (select auth.uid())
    and attempt.status = 'processing'
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
    and staging.uploaded_at is null;

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
  select attempt.* into v_attempt
  from public.memory_creation_attempts as attempt
  inner join public.space_members as member on member.id = attempt.creator_membership_id
  inner join public.spaces as space on space.id = attempt.space_id
  inner join public.users as profile on profile.id = member.user_id
  where attempt.id = p_attempt_id
    and attempt.creator_user_id = (select auth.uid())
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
  for update of attempt;

  if not found then
    raise exception 'creation attempt is unavailable';
  end if;
  if v_attempt.status = 'completed' then
    if not exists (
      select 1
      from public.memories as memory
      where memory.id = v_attempt.memory_id
        and memory.space_id = v_attempt.space_id
        and memory.deleted_at is null
    ) then
      raise exception 'creation attempt is unavailable';
    end if;
    return v_attempt.memory_id;
  end if;
  if v_attempt.status <> 'processing' then
    raise exception 'creation attempt failed';
  end if;

  if p_title is null or pg_catalog.char_length(pg_catalog.btrim(p_title)) not between 1 and 120
    or p_description is not null and pg_catalog.char_length(pg_catalog.btrim(p_description)) > 2000
    or p_location is not null and pg_catalog.char_length(pg_catalog.btrim(p_location)) > 150
    or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
    or p_memory_date > (pg_catalog.timezone(p_timezone, pg_catalog.now()))::date then
    raise exception 'invalid memory details';
  end if;

  select pg_catalog.count(*) into v_photo_count
  from public.memory_photo_staging as staging
  where staging.attempt_id = p_attempt_id
    and staging.uploaded_at is not null;

  if v_photo_count <> (
      select pg_catalog.count(*)
      from public.memory_photo_staging as staging
      where staging.attempt_id = p_attempt_id
    )
    or v_photo_count > 10
    or (v_photo_count = 0 and p_cover_photo_id is not null)
    or (v_photo_count > 0 and not exists (
      select 1
      from public.memory_photo_staging as staging
      where staging.id = p_cover_photo_id
        and staging.attempt_id = p_attempt_id
    )) then
    raise exception 'invalid staged photos';
  end if;

  insert into public.memories (
    space_id, creator_membership_id, creator_user_id, title, description, location,
    memory_date, visibility
  )
  values (
    v_attempt.space_id,
    v_attempt.creator_membership_id,
    v_attempt.creator_user_id,
    pg_catalog.btrim(p_title),
    pg_catalog.nullif(pg_catalog.btrim(p_description), ''),
    pg_catalog.nullif(pg_catalog.btrim(p_location), ''),
    p_memory_date,
    p_visibility
  )
  returning id into v_memory_id;

  insert into public.memory_photos (
    id, memory_id, object_path, cover_object_path, detail_object_path, position
  )
  select staging.id, v_memory_id, staging.object_path, staging.cover_object_path,
    staging.detail_object_path, staging.position
  from public.memory_photo_staging as staging
  where staging.attempt_id = p_attempt_id
  order by staging.position;

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

create function public.reserve_memory_edit_attempt(
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
  v_membership public.space_members;
  v_memory public.memories;
  v_attempt public.memory_edit_attempts;
  v_is_new boolean := false;
  v_inserted_count integer;
begin
  v_membership := private.active_membership();
  if v_membership.id is null then
    return query select null::uuid, false, null::uuid, 'unavailable'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  select memory.* into v_memory
  from public.memories as memory
  where memory.id = p_memory_id
    and memory.space_id = v_membership.space_id
    and memory.deleted_at is null;

  if not found then
    return query select null::uuid, false, null::uuid, 'unavailable'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  select * into v_attempt
  from public.memory_edit_attempts as attempt
  where attempt.editor_user_id = (select auth.uid())
    and attempt.idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_attempt.editor_membership_id <> v_membership.id
      or v_attempt.space_id <> v_membership.space_id then
      return query select null::uuid, false, null::uuid, 'unavailable'::text,
        null::public.memory_visibility, null::timestamptz;
      return;
    end if;
    if v_attempt.memory_id <> p_memory_id
      or v_attempt.request_fingerprint <> p_request_fingerprint
      or v_attempt.expected_updated_at <> p_expected_updated_at then
      return query select null::uuid, false, null::uuid, 'mismatch'::text,
        null::public.memory_visibility, null::timestamptz;
      return;
    end if;

    if v_attempt.status = 'failed' and v_attempt.outcome = 'failed' and not exists (
      select 1
      from public.memory_edit_photo_staging as staging
      where staging.attempt_id = v_attempt.id
        and staging.cleaned_at is null
    ) then
      delete from public.memory_edit_photo_staging as staging
      where staging.attempt_id = v_attempt.id;
      update public.memory_edit_attempts
      set status = 'processing',
        outcome = 'processing',
        cleanup_after = pg_catalog.timezone('utc', pg_catalog.now()) + interval '1 day'
      where id = v_attempt.id
      returning * into v_attempt;
      v_is_new := true;
    end if;

    return query select v_attempt.id, v_is_new, v_attempt.memory_id, v_attempt.outcome,
      v_attempt.result_visibility, v_attempt.result_updated_at;
    return;
  end if;

  insert into public.memory_edit_attempts (
    editor_membership_id, editor_user_id, space_id, memory_id, idempotency_key,
    request_fingerprint, expected_updated_at, status, outcome
  )
  values (
    v_membership.id,
    (select auth.uid()),
    v_membership.space_id,
    p_memory_id,
    p_idempotency_key,
    p_request_fingerprint,
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
  where attempt.editor_user_id = (select auth.uid())
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
  select attempt.* into v_attempt
  from public.memory_edit_attempts as attempt
  inner join public.space_members as member on member.id = attempt.editor_membership_id
  inner join public.spaces as space on space.id = attempt.space_id
  inner join public.users as profile on profile.id = member.user_id
  inner join public.memories as memory
    on memory.id = attempt.memory_id
    and memory.space_id = attempt.space_id
  where attempt.id = p_attempt_id
    and attempt.editor_user_id = (select auth.uid())
    and attempt.status = 'processing'
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
    and memory.deleted_at is null
  for update of attempt;

  if not found or p_position not between 0 and 4 then
    raise exception 'edit attempt is unavailable';
  end if;

  v_base_path := v_attempt.space_id::text || '/edits/' || p_attempt_id::text || '/' || p_photo_id::text;
  insert into public.memory_edit_photo_staging (
    id, attempt_id, object_path, cover_object_path, detail_object_path, position
  )
  values (
    p_photo_id, p_attempt_id, v_base_path || '/original', v_base_path || '/cover.webp',
    v_base_path || '/detail.webp', p_position
  );

  return query
  select staging.object_path, staging.cover_object_path, staging.detail_object_path
  from public.memory_edit_photo_staging as staging
  where staging.id = p_photo_id
    and staging.attempt_id = p_attempt_id;
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
  update public.memory_edit_photo_staging as staging
  set uploaded_at = pg_catalog.timezone('utc', pg_catalog.now())
  from public.memory_edit_attempts as attempt
  inner join public.space_members as member on member.id = attempt.editor_membership_id
  inner join public.spaces as space on space.id = attempt.space_id
  inner join public.users as profile on profile.id = member.user_id
  inner join public.memories as memory
    on memory.id = attempt.memory_id
    and memory.space_id = attempt.space_id
  where staging.id = p_photo_id
    and staging.attempt_id = p_attempt_id
    and attempt.id = staging.attempt_id
    and attempt.editor_user_id = (select auth.uid())
    and attempt.status = 'processing'
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
    and memory.deleted_at is null
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
  select attempt.* into v_attempt
  from public.memory_edit_attempts as attempt
  inner join public.space_members as member on member.id = attempt.editor_membership_id
  inner join public.spaces as space on space.id = attempt.space_id
  inner join public.users as profile on profile.id = member.user_id
  inner join public.memories as memory
    on memory.id = attempt.memory_id
    and memory.space_id = attempt.space_id
  where attempt.id = p_attempt_id
    and attempt.editor_user_id = (select auth.uid())
    and member.user_id = (select auth.uid())
    and member.space_id = attempt.space_id
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
    and memory.deleted_at is null
  for update of attempt;

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

  if not exists (
    select 1
    from public.space_members as member
    inner join public.spaces as space on space.id = member.space_id
    inner join public.users as profile on profile.id = member.user_id
    where member.id = v_attempt.editor_membership_id
      and member.user_id = (select auth.uid())
      and member.space_id = v_attempt.space_id
      and member.deleted_at is null
      and space.deleted_at is null
      and profile.deleted_at is null
  ) then
    update public.memory_edit_attempts
    set status = 'failed', outcome = 'unavailable'
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
    update public.memory_edit_attempts
    set status = 'failed', outcome = 'unavailable'
    where id = p_attempt_id;
    return query select v_attempt.memory_id, 'unavailable'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;
  if v_memory.updated_at <> v_attempt.expected_updated_at then
    update public.memory_edit_attempts
    set status = 'failed', outcome = 'conflict'
    where id = p_attempt_id;
    return query select v_attempt.memory_id, 'conflict'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  if p_title is null or pg_catalog.char_length(pg_catalog.btrim(p_title)) not between 1 and 120
    or p_description is not null and pg_catalog.char_length(pg_catalog.btrim(p_description)) > 2000
    or p_location is not null and pg_catalog.char_length(pg_catalog.btrim(p_location)) > 150
    or p_memory_date is null
    or p_visibility is null
    or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
    or p_memory_date > (pg_catalog.timezone(p_timezone, pg_catalog.now()))::date
    or pg_catalog.coalesce(pg_catalog.cardinality(p_retained_photo_ids), 0) <> (
      select pg_catalog.count(distinct retained_id)
      from pg_catalog.unnest(
        pg_catalog.coalesce(p_retained_photo_ids, array[]::uuid[])
      ) as retained(retained_id)
    ) then
    update public.memory_edit_attempts
    set status = 'failed', outcome = 'invalid'
    where id = p_attempt_id;
    return query select v_attempt.memory_id, 'invalid'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  select pg_catalog.count(*) into v_retained_count
  from public.memory_photos as photo
  where photo.memory_id = v_attempt.memory_id
    and photo.id = any(pg_catalog.coalesce(p_retained_photo_ids, array[]::uuid[]));

  select pg_catalog.count(*) into v_staged_count
  from public.memory_edit_photo_staging as staging
  where staging.attempt_id = p_attempt_id
    and staging.uploaded_at is not null;

  if v_retained_count <> pg_catalog.coalesce(pg_catalog.cardinality(p_retained_photo_ids), 0)
    or v_staged_count <> (
      select pg_catalog.count(*)
      from public.memory_edit_photo_staging as staging
      where staging.attempt_id = p_attempt_id
    )
    or v_retained_count + v_staged_count > 5
    or (v_retained_count + v_staged_count = 0 and p_cover_photo_id is not null)
    or (v_retained_count + v_staged_count > 0 and not (
      exists (
        select 1
        from public.memory_photos as retained_cover
        where retained_cover.memory_id = v_attempt.memory_id
          and retained_cover.id = p_cover_photo_id
          and retained_cover.id = any(
            pg_catalog.coalesce(p_retained_photo_ids, array[]::uuid[])
          )
      )
      or exists (
        select 1
        from public.memory_edit_photo_staging as staging
        where staging.attempt_id = p_attempt_id
          and staging.id = p_cover_photo_id
          and staging.uploaded_at is not null
      )
    )) then
    update public.memory_edit_attempts
    set status = 'failed', outcome = 'invalid'
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
    and not (photo.id = any(pg_catalog.coalesce(p_retained_photo_ids, array[]::uuid[])))
    and path.object_path is not null
  on conflict (object_path) do nothing;

  update public.memories
  set cover_photo_id = null
  where id = v_attempt.memory_id;

  delete from public.memory_photos as removed_photo
  where removed_photo.memory_id = v_attempt.memory_id
    and not (removed_photo.id = any(
      pg_catalog.coalesce(p_retained_photo_ids, array[]::uuid[])
    ));

  update public.memory_photos as shifted_photo
  set position = shifted_photo.position + 100
  where shifted_photo.memory_id = v_attempt.memory_id;

  with retained_positions as (
    select retained_photo.id,
      pg_catalog.row_number() over (order by retained_photo.position) - 1 as final_position
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
  set title = pg_catalog.btrim(p_title),
    description = pg_catalog.nullif(pg_catalog.btrim(p_description), ''),
    location = pg_catalog.nullif(pg_catalog.btrim(p_location), ''),
    memory_date = p_memory_date,
    visibility = p_visibility,
    cover_photo_id = p_cover_photo_id
  where id = v_attempt.memory_id
  returning updated_at into v_result_updated_at;

  update public.memory_edit_attempts
  set status = 'completed',
    outcome = 'completed',
    result_visibility = p_visibility,
    result_updated_at = v_result_updated_at
  where id = p_attempt_id;

  return query
  select v_attempt.memory_id, 'completed'::text, p_visibility, v_result_updated_at;
end;
$$;

create function public.place_memory(
  p_memory_id uuid,
  p_target_visibility public.memory_visibility,
  p_expected_updated_at timestamptz
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
  v_membership public.space_members;
  v_memory public.memories;
  v_result_updated_at timestamptz;
begin
  v_membership := private.active_membership();
  if v_membership.id is null then
    return query select null::uuid, 'unavailable'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  select * into v_memory
  from public.memories as memory
  where memory.id = p_memory_id
    and memory.space_id = v_membership.space_id
    and memory.deleted_at is null
  for update;

  if not found or v_memory.visibility = p_target_visibility then
    return query select null::uuid, 'unavailable'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;
  if v_memory.updated_at <> p_expected_updated_at then
    return query select null::uuid, 'conflict'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  update public.memories
  set visibility = p_target_visibility
  where id = v_memory.id
  returning updated_at into v_result_updated_at;

  return query select v_memory.id, 'completed'::text, p_target_visibility, v_result_updated_at;
end;
$$;

create function public.delete_memory(
  p_memory_id text,
  p_expected_updated_at timestamptz
)
returns table (outcome text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.space_members;
  v_memory_id uuid;
  v_memory public.memories;
begin
  v_membership := private.active_membership();
  if v_membership.id is null or p_memory_id is null or p_expected_updated_at is null then
    return query select 'unavailable'::text;
    return;
  end if;

  begin
    v_memory_id := p_memory_id::uuid;
  exception when invalid_text_representation then
    return query select 'unavailable'::text;
    return;
  end;

  select memory.* into v_memory
  from public.memories as memory
  where memory.id = v_memory_id
    and memory.space_id = v_membership.space_id
  for update;

  if not found or v_memory.deleted_at is not null then
    return query select 'unavailable'::text;
    return;
  end if;
  if v_memory.updated_at <> p_expected_updated_at then
    return query select 'conflict'::text;
    return;
  end if;

  update public.memories as memory
  set deleted_at = pg_catalog.timezone('utc', pg_catalog.now())
  where memory.id = v_memory.id
    and memory.deleted_at is null;

  return query select 'completed'::text;
end;
$$;

create function public.create_memory_comment(
  p_memory_id uuid,
  p_idempotency_key uuid,
  p_body text,
  p_request_fingerprint text
)
returns table (
  comment_id uuid,
  memory_id uuid,
  space_id uuid,
  author_user_id uuid,
  author_display_name text,
  body text,
  created_at timestamptz,
  outcome text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.space_members;
  v_memory public.memories;
  v_body text;
  v_existing public.memory_comments;
  v_comment public.memory_comments;
  v_inserted_count integer;
begin
  v_membership := private.active_membership();
  if v_membership.id is null then
    return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::timestamptz, 'unavailable'::text;
    return;
  end if;

  select memory.* into v_memory
  from public.memories as memory
  where memory.id = p_memory_id
    and memory.space_id = v_membership.space_id
  for update;

  if not found or v_memory.deleted_at is not null then
    return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::timestamptz, 'unavailable'::text;
    return;
  end if;

  v_body := pg_catalog.btrim(p_body);
  if p_body is null or pg_catalog.char_length(v_body) not between 1 and 1000
    or p_idempotency_key is null
    or p_request_fingerprint is null
    or pg_catalog.btrim(p_request_fingerprint) !~ '^[a-f0-9]{64}$' then
    return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::timestamptz, 'invalid'::text;
    return;
  end if;

  select * into v_existing
  from public.memory_comments as comment
  where comment.author_user_id = (select auth.uid())
    and comment.idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_existing.author_membership_id <> v_membership.id
      or v_existing.space_id <> v_membership.space_id
      or v_existing.memory_id <> p_memory_id
      or v_existing.request_fingerprint <> pg_catalog.btrim(p_request_fingerprint) then
      return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
        null::text, null::timestamptz, 'mismatch'::text;
      return;
    end if;
    if v_existing.deleted_at is not null then
      return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
        null::text, null::timestamptz, 'unavailable'::text;
      return;
    end if;
    v_comment := v_existing;
  else
    insert into public.memory_comments (
      author_membership_id, author_user_id, body, idempotency_key, memory_id,
      request_fingerprint, space_id
    )
    values (
      v_membership.id,
      (select auth.uid()),
      v_body,
      p_idempotency_key,
      p_memory_id,
      pg_catalog.btrim(p_request_fingerprint),
      v_membership.space_id
    )
    on conflict on constraint memory_comments_author_key_unique do nothing
    returning * into v_comment;

    get diagnostics v_inserted_count = row_count;
    if v_inserted_count = 0 then
      select * into v_existing
      from public.memory_comments as comment
      where comment.author_user_id = (select auth.uid())
        and comment.idempotency_key = p_idempotency_key
      for update;

      if not found
        or v_existing.author_membership_id <> v_membership.id
        or v_existing.space_id <> v_membership.space_id
        or v_existing.memory_id <> p_memory_id
        or v_existing.request_fingerprint <> pg_catalog.btrim(p_request_fingerprint)
        or v_existing.deleted_at is not null then
        return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
          null::text, null::timestamptz,
          case when found then 'mismatch' else 'unavailable' end::text;
        return;
      end if;
      v_comment := v_existing;
    end if;
  end if;

  return query select v_comment.id, v_comment.memory_id, v_comment.space_id,
    v_comment.author_user_id, v_membership.display_name, v_comment.body,
    v_comment.created_at, 'completed'::text;
end;
$$;

create function public.update_memory_comment(
  p_memory_id uuid,
  p_comment_id uuid,
  p_expected_version integer,
  p_body text
)
returns table (
  comment_id uuid,
  memory_id uuid,
  author_user_id uuid,
  author_display_name text,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  version integer,
  outcome text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.space_members;
  v_body text;
  v_comment public.memory_comments;
begin
  v_membership := private.active_membership();
  if v_membership.id is null then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'unavailable'::text;
    return;
  end if;

  select comment.* into v_comment
  from public.memory_comments as comment
  inner join public.memories as memory
    on memory.id = comment.memory_id
    and memory.space_id = comment.space_id
  where comment.id = p_comment_id
    and comment.memory_id = p_memory_id
    and comment.space_id = v_membership.space_id
    and comment.author_membership_id = v_membership.id
    and comment.deleted_at is null
    and memory.deleted_at is null
  for update of comment;

  if not found then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'unavailable'::text;
    return;
  end if;

  v_body := pg_catalog.btrim(p_body);
  if p_body is null or pg_catalog.char_length(v_body) not between 1 and 1000
    or p_expected_version is null or p_expected_version < 1 then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'invalid'::text;
    return;
  end if;
  if v_comment.version <> p_expected_version then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'conflict'::text;
    return;
  end if;

  update public.memory_comments as comment
  set body = v_body,
    updated_at = pg_catalog.timezone('utc', pg_catalog.now()),
    version = comment.version + 1
  where comment.id = v_comment.id
  returning * into v_comment;

  return query select v_comment.id, v_comment.memory_id, v_comment.author_user_id,
    v_membership.display_name, v_comment.body, v_comment.created_at, v_comment.updated_at,
    v_comment.version, 'completed'::text;
end;
$$;

create function public.delete_memory_comment(
  p_memory_id uuid,
  p_comment_id uuid,
  p_expected_version integer
)
returns table (outcome text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.space_members;
  v_comment public.memory_comments;
begin
  v_membership := private.active_membership();
  if v_membership.id is null or p_expected_version is null or p_expected_version < 1 then
    return query select 'unavailable'::text;
    return;
  end if;

  select comment.* into v_comment
  from public.memory_comments as comment
  inner join public.memories as memory
    on memory.id = comment.memory_id
    and memory.space_id = comment.space_id
  where comment.id = p_comment_id
    and comment.memory_id = p_memory_id
    and comment.space_id = v_membership.space_id
    and comment.author_membership_id = v_membership.id
    and comment.deleted_at is null
    and memory.deleted_at is null
  for update of comment;

  if not found then
    return query select 'unavailable'::text;
    return;
  end if;
  if v_comment.version <> p_expected_version then
    return query select 'conflict'::text;
    return;
  end if;

  update public.memory_comments as comment
  set deleted_at = pg_catalog.timezone('utc', pg_catalog.now())
  where comment.id = v_comment.id;

  return query select 'completed'::text;
end;
$$;

create function public.get_memory_reaction_summary(p_memory_id uuid)
returns table (
  current_reaction text,
  heart_count bigint,
  laugh_count bigint,
  cry_count bigint,
  star_count bigint,
  reaction_members jsonb,
  outcome text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.space_members;
begin
  v_membership := private.active_membership();
  if v_membership.id is null or p_memory_id is null or not exists (
    select 1
    from public.memories as memory
    where memory.id = p_memory_id
      and memory.space_id = v_membership.space_id
      and memory.deleted_at is null
  ) then
    return query select null::text, null::bigint, null::bigint, null::bigint,
      null::bigint, null::jsonb, 'unavailable'::text;
    return;
  end if;

  return query
  select
    pg_catalog.max(reaction.reaction_type)
      filter (where reaction.membership_id = v_membership.id),
    pg_catalog.count(*) filter (where reaction.reaction_type = 'heart'),
    pg_catalog.count(*) filter (where reaction.reaction_type = 'laugh'),
    pg_catalog.count(*) filter (where reaction.reaction_type = 'cry'),
    pg_catalog.count(*) filter (where reaction.reaction_type = 'star'),
    pg_catalog.jsonb_build_object(
      'heart', pg_catalog.coalesce(
        pg_catalog.jsonb_agg(member.display_name order by member.display_name)
          filter (where reaction.reaction_type = 'heart'),
        '[]'::jsonb
      ),
      'laugh', pg_catalog.coalesce(
        pg_catalog.jsonb_agg(member.display_name order by member.display_name)
          filter (where reaction.reaction_type = 'laugh'),
        '[]'::jsonb
      ),
      'cry', pg_catalog.coalesce(
        pg_catalog.jsonb_agg(member.display_name order by member.display_name)
          filter (where reaction.reaction_type = 'cry'),
        '[]'::jsonb
      ),
      'star', pg_catalog.coalesce(
        pg_catalog.jsonb_agg(member.display_name order by member.display_name)
          filter (where reaction.reaction_type = 'star'),
        '[]'::jsonb
      )
    ),
    'completed'::text
  from public.memory_reactions as reaction
  inner join public.space_members as member
    on member.id = reaction.membership_id
    and member.space_id = v_membership.space_id
    and member.deleted_at is null
  inner join public.users as profile
    on profile.id = member.user_id
    and profile.deleted_at is null
  where reaction.memory_id = p_memory_id;
end;
$$;

create function public.toggle_memory_reaction(
  p_memory_id uuid,
  p_reaction_type text
)
returns table (
  current_reaction text,
  heart_count bigint,
  laugh_count bigint,
  cry_count bigint,
  star_count bigint,
  reaction_members jsonb,
  outcome text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.space_members;
  v_memory public.memories;
  v_reaction public.memory_reactions;
begin
  v_membership := private.active_membership();
  if v_membership.id is null then
    return query select null::text, null::bigint, null::bigint, null::bigint,
      null::bigint, null::jsonb, 'unavailable'::text;
    return;
  end if;

  select memory.* into v_memory
  from public.memories as memory
  where memory.id = p_memory_id
    and memory.space_id = v_membership.space_id
  for update;

  if not found or v_memory.deleted_at is not null
    or p_reaction_type not in ('heart', 'laugh', 'cry', 'star') then
    return query select null::text, null::bigint, null::bigint, null::bigint,
      null::bigint, null::jsonb, 'unavailable'::text;
    return;
  end if;

  loop
    select reaction.* into v_reaction
    from public.memory_reactions as reaction
    where reaction.membership_id = v_membership.id
      and reaction.memory_id = v_memory.id
    for update;

    if found then
      if v_reaction.reaction_type = p_reaction_type then
        delete from public.memory_reactions as reaction
        where reaction.id = v_reaction.id;
      else
        update public.memory_reactions as reaction
        set reaction_type = p_reaction_type,
          updated_at = pg_catalog.timezone('utc', pg_catalog.now())
        where reaction.id = v_reaction.id;
      end if;
      exit;
    end if;

    insert into public.memory_reactions (membership_id, memory_id, space_id, reaction_type)
    values (v_membership.id, v_memory.id, v_membership.space_id, p_reaction_type)
    on conflict (membership_id, memory_id) do nothing
    returning * into v_reaction;

    if found then
      exit;
    end if;
  end loop;

  return query
  select * from public.get_memory_reaction_summary(v_memory.id);
end;
$$;

revoke all on function public.reserve_memory_creation_attempt(uuid, text)
from public, anon, authenticated, service_role;
revoke all on function public.stage_memory_photo_variants(uuid, uuid, integer)
from public, anon, authenticated, service_role;
revoke all on function public.mark_memory_photo_uploaded(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.finalize_memory_creation_attempt(
  uuid, text, text, text, date, text, public.memory_visibility, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.reserve_memory_edit_attempt(uuid, uuid, text, timestamptz)
from public, anon, authenticated, service_role;
revoke all on function public.stage_memory_edit_photo_variants(uuid, uuid, integer)
from public, anon, authenticated, service_role;
revoke all on function public.mark_memory_edit_photo_uploaded(uuid, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.finalize_memory_edit_attempt(
  uuid, text, text, text, date, text, public.memory_visibility, uuid[], uuid
) from public, anon, authenticated, service_role;
revoke all on function public.place_memory(uuid, public.memory_visibility, timestamptz)
from public, anon, authenticated, service_role;
revoke all on function public.delete_memory(text, timestamptz)
from public, anon, authenticated, service_role;
revoke all on function public.create_memory_comment(uuid, uuid, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.update_memory_comment(uuid, uuid, integer, text)
from public, anon, authenticated, service_role;
revoke all on function public.delete_memory_comment(uuid, uuid, integer)
from public, anon, authenticated, service_role;
revoke all on function public.get_memory_reaction_summary(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.toggle_memory_reaction(uuid, text)
from public, anon, authenticated, service_role;

grant execute on function public.reserve_memory_creation_attempt(uuid, text) to authenticated;
grant execute on function public.stage_memory_photo_variants(uuid, uuid, integer) to authenticated;
grant execute on function public.mark_memory_photo_uploaded(uuid) to authenticated;
grant execute on function public.finalize_memory_creation_attempt(
  uuid, text, text, text, date, text, public.memory_visibility, uuid
) to authenticated;
grant execute on function public.reserve_memory_edit_attempt(uuid, uuid, text, timestamptz)
to authenticated;
grant execute on function public.stage_memory_edit_photo_variants(uuid, uuid, integer)
to authenticated;
grant execute on function public.mark_memory_edit_photo_uploaded(uuid, uuid) to authenticated;
grant execute on function public.finalize_memory_edit_attempt(
  uuid, text, text, text, date, text, public.memory_visibility, uuid[], uuid
) to authenticated;
grant execute on function public.place_memory(uuid, public.memory_visibility, timestamptz)
to authenticated;
grant execute on function public.delete_memory(text, timestamptz) to authenticated;
grant execute on function public.create_memory_comment(uuid, uuid, text, text) to authenticated;
grant execute on function public.update_memory_comment(uuid, uuid, integer, text) to authenticated;
grant execute on function public.delete_memory_comment(uuid, uuid, integer) to authenticated;
grant execute on function public.get_memory_reaction_summary(uuid) to authenticated;
grant execute on function public.toggle_memory_reaction(uuid, text) to authenticated;

revoke execute on function public.create_space(text, text, date, text) from service_role;
revoke execute on function public.get_active_space() from service_role;
revoke execute on function public.process_space_invite(text, text, boolean) from service_role;
revoke execute on function public.complete_space_setup() from service_role;
revoke execute on function public.regenerate_space_invite() from service_role;
revoke execute on function public.get_active_space_settings() from service_role;
revoke execute on function public.rename_active_space(text, timestamptz) from service_role;
revoke execute on function public.update_active_space_start_date(text, text, timestamptz)
from service_role;
revoke execute on function public.update_active_membership_display_name(text, timestamptz)
from service_role;
revoke execute on function public.get_available_memory(uuid) from service_role;

revoke all on function public.fail_memory_creation_attempt(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.mark_memory_photo_staging_cleaned(text[])
from public, anon, authenticated, service_role;
revoke all on function public.list_stale_memory_photo_staging()
from public, anon, authenticated, service_role;
revoke all on function public.fail_memory_edit_attempt(uuid)
from public, anon, authenticated, service_role;
revoke all on function public.mark_memory_edit_staging_cleaned(text[])
from public, anon, authenticated, service_role;
revoke all on function public.list_stale_memory_edit_staging()
from public, anon, authenticated, service_role;
revoke all on function public.list_memory_photo_cleanup()
from public, anon, authenticated, service_role;
revoke all on function public.mark_memory_photo_cleanup_completed(text[])
from public, anon, authenticated, service_role;

grant execute on function public.fail_memory_creation_attempt(uuid) to service_role;
grant execute on function public.mark_memory_photo_staging_cleaned(text[]) to service_role;
grant execute on function public.list_stale_memory_photo_staging() to service_role;
grant execute on function public.fail_memory_edit_attempt(uuid) to service_role;
grant execute on function public.mark_memory_edit_staging_cleaned(text[]) to service_role;
grant execute on function public.list_stale_memory_edit_staging() to service_role;
grant execute on function public.list_memory_photo_cleanup() to service_role;
grant execute on function public.mark_memory_photo_cleanup_completed(text[]) to service_role;

drop function public.reserve_memory_creation_attempt(uuid, uuid, text);
drop function public.stage_memory_photo(uuid, uuid, integer);
drop function public.reserve_memory_edit_attempt(uuid, uuid, uuid, text, timestamptz);
drop function public.place_memory(uuid, uuid, public.memory_visibility, timestamptz);
drop function public.delete_memory(uuid, text, timestamptz);
drop function public.create_memory_comment(uuid, uuid, uuid, text, text);
drop function public.update_memory_comment(uuid, uuid, uuid, integer, text);
drop function public.delete_memory_comment(uuid, uuid, uuid, integer);
drop function public.get_memory_reaction_summary(uuid, uuid);
drop function public.toggle_memory_reaction(uuid, uuid, text);
