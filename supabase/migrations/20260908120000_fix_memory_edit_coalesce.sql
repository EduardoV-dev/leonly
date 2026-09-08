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
    or coalesce(pg_catalog.cardinality(p_retained_photo_ids), 0) <> (
      select pg_catalog.count(distinct retained_id)
      from pg_catalog.unnest(coalesce(p_retained_photo_ids, array[]::uuid[])) as retained(retained_id)
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
    and photo.id = any(coalesce(p_retained_photo_ids, array[]::uuid[]));

  select pg_catalog.count(*) into v_staged_count
  from public.memory_edit_photo_staging as staging
  where staging.attempt_id = p_attempt_id
    and staging.uploaded_at is not null;

  if v_retained_count <> coalesce(pg_catalog.cardinality(p_retained_photo_ids), 0)
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
          and retained_cover.id = any(coalesce(p_retained_photo_ids, array[]::uuid[]))
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
    and not (photo.id = any(coalesce(p_retained_photo_ids, array[]::uuid[])))
    and path.object_path is not null
  on conflict (object_path) do nothing;

  update public.memories
  set cover_photo_id = null
  where id = v_attempt.memory_id;

  delete from public.memory_photos as removed_photo
  where removed_photo.memory_id = v_attempt.memory_id
    and not (removed_photo.id = any(coalesce(p_retained_photo_ids, array[]::uuid[])));

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
    description = nullif(pg_catalog.btrim(p_description), ''),
    location = nullif(pg_catalog.btrim(p_location), ''),
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
