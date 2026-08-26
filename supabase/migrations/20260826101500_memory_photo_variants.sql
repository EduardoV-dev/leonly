alter table public.memory_photos
  add column cover_object_path text,
  add column detail_object_path text,
  add constraint memory_photos_cover_object_path_not_blank_check
    check (cover_object_path is null or char_length(btrim(cover_object_path)) > 0),
  add constraint memory_photos_detail_object_path_not_blank_check
    check (detail_object_path is null or char_length(btrim(detail_object_path)) > 0);

alter table public.memory_photo_staging
  add column cover_object_path text,
  add column detail_object_path text,
  add constraint memory_photo_staging_cover_object_path_not_blank_check
    check (cover_object_path is null or char_length(btrim(cover_object_path)) > 0),
  add constraint memory_photo_staging_detail_object_path_not_blank_check
    check (detail_object_path is null or char_length(btrim(detail_object_path)) > 0);

create unique index memory_photos_cover_object_path_unique
on public.memory_photos (cover_object_path)
where cover_object_path is not null;

create unique index memory_photos_detail_object_path_unique
on public.memory_photos (detail_object_path)
where detail_object_path is not null;

create unique index memory_photo_staging_cover_object_path_unique
on public.memory_photo_staging (cover_object_path)
where cover_object_path is not null;

create unique index memory_photo_staging_detail_object_path_unique
on public.memory_photo_staging (detail_object_path)
where detail_object_path is not null;

create or replace function public.stage_memory_photo_variants(
  p_attempt_id uuid,
  p_photo_id uuid,
  p_position integer
)
returns table (
  object_path text,
  cover_object_path text,
  detail_object_path text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.memory_creation_attempts;
  v_base_path text;
  v_object_path text;
  v_cover_object_path text;
  v_detail_object_path text;
begin
  perform private.require_service_role();

  select * into v_attempt
  from public.memory_creation_attempts
  where id = p_attempt_id
  for update;

  if not found or v_attempt.status <> 'processing' then
    raise exception 'creation attempt is unavailable';
  end if;

  v_base_path := v_attempt.space_id::text || '/' || p_attempt_id::text || '/' || p_photo_id::text;
  v_object_path := v_base_path || '/original';
  v_cover_object_path := v_base_path || '/cover.webp';
  v_detail_object_path := v_base_path || '/detail.webp';

  insert into public.memory_photo_staging (
    id,
    attempt_id,
    object_path,
    cover_object_path,
    detail_object_path,
    position
  )
  values (
    p_photo_id,
    p_attempt_id,
    v_object_path,
    v_cover_object_path,
    v_detail_object_path,
    p_position
  )
  on conflict (id) do nothing;

  return query select v_object_path, v_cover_object_path, v_detail_object_path;
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
    or v_photo_count > 10
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

  insert into public.memory_photos (
    id,
    memory_id,
    object_path,
    cover_object_path,
    detail_object_path,
    position
  )
  select
    id,
    v_memory_id,
    object_path,
    cover_object_path,
    detail_object_path,
    position
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
  select path.object_path
  from public.memory_photo_staging as staging
  cross join lateral (
    values (staging.object_path), (staging.cover_object_path), (staging.detail_object_path)
  ) as path(object_path)
  where staging.attempt_id = p_attempt_id
    and staging.cleaned_at is null
    and path.object_path is not null;
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
  where object_path = any(p_object_paths)
    or cover_object_path = any(p_object_paths)
    or detail_object_path = any(p_object_paths);
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
  select staging.attempt_id, path.object_path
  from public.memory_photo_staging as staging
  inner join public.memory_creation_attempts as attempt on attempt.id = staging.attempt_id
  cross join lateral (
    values (staging.object_path), (staging.cover_object_path), (staging.detail_object_path)
  ) as path(object_path)
  where attempt.status = 'failed'
    and staging.cleaned_at is null
    and path.object_path is not null;
end;
$$;

drop policy "Available space members can view private memory photo objects" on storage.objects;

create policy "Available space members can view private memory photo objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'memory-photos'
  and exists (
    select 1
    from public.memory_photos as photo
    inner join public.memories as memory on memory.id = photo.memory_id
    inner join public.spaces as space on space.id = memory.space_id
    inner join public.space_members as member on member.space_id = space.id
    inner join public.users as profile on profile.id = member.user_id
    where storage.objects.name in (
        photo.object_path,
        photo.cover_object_path,
        photo.detail_object_path
      )
      and storage.objects.name like space.id::text || '/%'
      and memory.deleted_at is null
      and space.deleted_at is null
      and member.user_id = (select auth.uid())
      and member.deleted_at is null
      and profile.deleted_at is null
  )
);

revoke all on function public.stage_memory_photo_variants(uuid, uuid, integer)
from public, anon, authenticated;
grant execute on function public.stage_memory_photo_variants(uuid, uuid, integer) to service_role;
