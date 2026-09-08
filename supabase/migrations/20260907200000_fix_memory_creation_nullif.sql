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
    nullif(pg_catalog.btrim(p_description), ''),
    nullif(pg_catalog.btrim(p_location), ''),
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
