create or replace function public.get_memory_creation_result(
  p_actor_subject text,
  p_mutation_id uuid,
  p_memory_id uuid,
  p_space_id uuid,
  p_title text,
  p_description text,
  p_location text,
  p_memory_date date,
  p_visibility public.memory_visibility,
  p_assets jsonb default '[]'::jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  membership public.space_members := private.active_membership_for_actor(p_actor_subject);
  memory public.memories;
begin
  if membership.id is null or membership.space_id <> p_space_id then
    return jsonb_build_object('status', 'unavailable', 'memory_id', null, 'visibility', null);
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_actor_subject || ':' || p_mutation_id::text, 0)
  );
  select * into memory from public.memories
  where creator_membership_id = membership.id and creation_mutation_id = p_mutation_id;
  if found then
    if memory.id <> p_memory_id or memory.space_id <> p_space_id
      or memory.title <> btrim(p_title)
      or memory.description is distinct from nullif(btrim(p_description), '')
      or memory.location is distinct from nullif(btrim(p_location), '')
      or memory.memory_date <> p_memory_date or memory.visibility <> p_visibility
      or jsonb_typeof(p_assets) <> 'array'
      or (select count(*) from public.memory_assets where memory_id = memory.id)
        <> jsonb_array_length(p_assets)
      or exists (
        select 1 from jsonb_array_elements(p_assets) as entry
        where not exists (
          select 1 from public.memory_assets as stored_asset
          where stored_asset.memory_id = memory.id
            and stored_asset.id = (entry->>'asset_id')::uuid
            and stored_asset.position = (entry->>'position')::smallint
            and ((entry->>'is_cover')::boolean = (memory.cover_asset_id = stored_asset.id))
            and exists (select 1 from public.memory_asset_objects as object
              where object.asset_id = stored_asset.id and object.variant_type = 'original'
                and object.object_path = entry->>'original_path')
            and exists (select 1 from public.memory_asset_objects as object
              where object.asset_id = stored_asset.id and object.variant_type = 'cover'
                and object.object_path = entry->>'cover_path')
            and exists (select 1 from public.memory_asset_objects as object
              where object.asset_id = stored_asset.id and object.variant_type = 'detail'
                and object.object_path = entry->>'detail_path')
        )
      ) then
      return jsonb_build_object('status', 'mismatch', 'memory_id', null, 'visibility', null);
    end if;
    return jsonb_build_object('status', 'completed', 'memory_id', memory.id,
      'visibility', memory.visibility);
  end if;
  if exists (select 1 from public.resource_cleanup
    where resource_kind = 'storage_object'
      and (resource_locator like membership.space_id::text || '/temporary/' || p_mutation_id::text || '/%'
        or resource_locator like membership.space_id::text || '/memories/' || p_memory_id::text || '/%')) then
    return jsonb_build_object('status', 'cleanup_pending', 'memory_id', null, 'visibility', null);
  end if;
  return jsonb_build_object('status', 'pending', 'memory_id', null, 'visibility', null);
exception when check_violation or invalid_text_representation then
  return jsonb_build_object('status', 'invalid', 'memory_id', null, 'visibility', null);
end;
$$;

create or replace function public.finalize_memory_creation(
  p_actor_subject text,
  p_mutation_id uuid,
  p_memory_id uuid,
  p_space_id uuid,
  p_title text,
  p_description text,
  p_location text,
  p_memory_date date,
  p_visibility public.memory_visibility,
  p_assets jsonb default '[]'::jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  membership public.space_members := private.active_membership_for_actor(p_actor_subject);
  memory public.memories;
  asset jsonb;
  asset_id uuid;
  cover_id uuid;
  base_path text;
begin
  if membership.id is null or membership.space_id <> p_space_id then
    return jsonb_build_object('status', 'unavailable', 'memory_id', null, 'visibility', null);
  end if;
  if p_mutation_id is null or p_memory_id is null
    or char_length(btrim(p_title)) not between 1 and 120
    or char_length(btrim(coalesce(p_description, ''))) > 2000
    or char_length(btrim(coalesce(p_location, ''))) > 150
    or p_memory_date is null or p_visibility is null
    or jsonb_typeof(p_assets) <> 'array' or jsonb_array_length(p_assets) > 10 then
    return jsonb_build_object('status', 'invalid', 'memory_id', null, 'visibility', null);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_actor_subject || ':' || p_mutation_id::text, 0)
  );
  select * into memory from public.memories
  where creator_membership_id = membership.id and creation_mutation_id = p_mutation_id;
  if found then
    if memory.id <> p_memory_id or memory.space_id <> p_space_id
      or memory.title <> btrim(p_title)
      or memory.description is distinct from nullif(btrim(p_description), '')
      or memory.location is distinct from nullif(btrim(p_location), '')
      or memory.memory_date <> p_memory_date or memory.visibility <> p_visibility
      or (select count(*) from public.memory_assets where memory_id = memory.id)
        <> jsonb_array_length(p_assets)
      or exists (
        select 1 from jsonb_array_elements(p_assets) as entry
        where not exists (
          select 1 from public.memory_assets as stored_asset
          where stored_asset.memory_id = memory.id
            and stored_asset.id = (entry->>'asset_id')::uuid
            and stored_asset.position = (entry->>'position')::smallint
            and ((entry->>'is_cover')::boolean = (memory.cover_asset_id = stored_asset.id))
            and exists (select 1 from public.memory_asset_objects as object
              where object.asset_id = stored_asset.id and object.variant_type = 'original'
                and object.object_path = entry->>'original_path')
            and exists (select 1 from public.memory_asset_objects as object
              where object.asset_id = stored_asset.id and object.variant_type = 'cover'
                and object.object_path = entry->>'cover_path')
            and exists (select 1 from public.memory_asset_objects as object
              where object.asset_id = stored_asset.id and object.variant_type = 'detail'
                and object.object_path = entry->>'detail_path')
        )
      ) then
      return jsonb_build_object('status', 'mismatch', 'memory_id', null, 'visibility', null);
    end if;
    return jsonb_build_object('status', 'completed', 'memory_id', memory.id,
      'visibility', memory.visibility);
  end if;
  if exists (select 1 from public.resource_cleanup
    where resource_kind = 'storage_object'
      and (resource_locator like membership.space_id::text || '/temporary/' || p_mutation_id::text || '/%'
        or resource_locator like membership.space_id::text || '/memories/' || p_memory_id::text || '/%')) then
    return jsonb_build_object('status', 'cleanup_pending', 'memory_id', null, 'visibility', null);
  end if;

  insert into public.memories (
    id, creation_mutation_id, space_id, creator_membership_id,
    title, description, location, memory_date, visibility
  ) values (
    p_memory_id, p_mutation_id, membership.space_id, membership.id,
    btrim(p_title), nullif(btrim(p_description), ''), nullif(btrim(p_location), ''),
    p_memory_date, p_visibility
  ) returning * into memory;

  for asset in select value from jsonb_array_elements(p_assets) loop
    asset_id := (asset->>'asset_id')::uuid;
    base_path := membership.space_id::text || '/memories/' || p_memory_id::text || '/' || asset_id::text;
    if (asset->>'original_path') <> base_path || '/original'
      or (asset->>'cover_path') <> base_path || '/cover.webp'
      or (asset->>'detail_path') <> base_path || '/detail.webp' then
      raise exception using errcode = '23514', message = 'invalid memory asset path';
    end if;
    insert into public.memory_assets (id, space_id, memory_id, position)
    values (asset_id, membership.space_id, memory.id, (asset->>'position')::smallint);
    insert into public.memory_asset_objects (
      asset_id, variant_type, object_path, status, content_type, byte_size, ready_at
    ) values
      (asset_id, 'original', asset->>'original_path', 'ready',
        asset->>'original_content_type', (asset->>'original_byte_size')::bigint,
        pg_catalog.clock_timestamp()),
      (asset_id, 'cover', asset->>'cover_path', 'ready', 'image/webp',
        (asset->>'cover_byte_size')::bigint, pg_catalog.clock_timestamp()),
      (asset_id, 'detail', asset->>'detail_path', 'ready', 'image/webp',
        (asset->>'detail_byte_size')::bigint, pg_catalog.clock_timestamp());
    if (asset->>'is_cover')::boolean then cover_id := asset_id; end if;
  end loop;
  update public.memories set cover_asset_id = cover_id where id = memory.id returning * into memory;
  return jsonb_build_object('status', 'completed', 'memory_id', memory.id,
    'visibility', memory.visibility);
exception when unique_violation or check_violation or foreign_key_violation or invalid_text_representation then
  return jsonb_build_object('status', 'invalid', 'memory_id', null, 'visibility', null);
end;
$$;

create or replace function public.enqueue_memory_creation_cleanup(
  p_actor_subject text,
  p_memory_id uuid,
  p_mutation_id uuid,
  p_paths text[]
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  membership public.space_members := private.active_membership_for_actor(p_actor_subject);
  is_finalized boolean;
begin
  if membership.id is null or p_memory_id is null or p_mutation_id is null
    or cardinality(p_paths) > 40 then return;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_actor_subject || ':' || p_mutation_id::text, 0)
  );
  select exists (select 1 from public.memories where creator_membership_id = membership.id
    and creation_mutation_id = p_mutation_id) into is_finalized;
  insert into public.resource_cleanup (resource_kind, resource_locator, cleanup_after)
  select 'storage_object', path, pg_catalog.clock_timestamp() + interval '15 minutes'
  from unnest(p_paths) as path
  where path like membership.space_id::text || '/temporary/' || p_mutation_id::text || '/%'
    or (not is_finalized
      and path like membership.space_id::text || '/memories/' || p_memory_id::text || '/%')
  on conflict (resource_kind, resource_locator) do nothing;
end;
$$;

create or replace function public.can_mutate_memory_comment(p_memory_id uuid, p_comment_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memory_comments as comment
    inner join public.memories as memory
      on (memory.id, memory.space_id) = (comment.memory_id, comment.space_id)
    inner join public.space_members as author on author.id = comment.author_membership_id
    where comment.id = p_comment_id and comment.memory_id = p_memory_id
      and author.user_id = private.current_user_id()
      and comment.deleted_at is null and memory.deleted_at is null
  );
$$;

create or replace function public.update_memory_comment(
  p_memory_id uuid,
  p_comment_id uuid,
  p_expected_version integer,
  p_body text
)
returns table (
  comment_id uuid, memory_id uuid, author_user_id uuid, author_display_name text,
  body text, created_at timestamptz, updated_at timestamptz, version integer, outcome text
) language plpgsql security definer set search_path = '' as $$
declare
  membership public.space_members := private.active_membership();
  comment public.memory_comments;
  normalized_body text := btrim(p_body);
begin
  select comment_row.* into comment from public.memory_comments as comment_row
  inner join public.memories as memory
    on (memory.id, memory.space_id) = (comment_row.memory_id, comment_row.space_id)
  where comment_row.id = p_comment_id and comment_row.memory_id = p_memory_id
    and comment_row.author_membership_id = membership.id and comment_row.deleted_at is null
    and memory.deleted_at is null for update of comment_row;
  if not found then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'unavailable'::text;
  elsif char_length(normalized_body) not between 1 and 1000 or p_expected_version < 1 then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'invalid'::text;
  elsif comment.version <> p_expected_version then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'conflict'::text;
  else
    update public.memory_comments as comment_row
    set body = normalized_body, version = comment_row.version + 1
    where comment_row.id = comment.id returning comment_row.* into comment;
    return query select comment.id, comment.memory_id, membership.user_id,
      membership.display_name, comment.body, comment.created_at, comment.updated_at,
      comment.version, 'completed'::text;
  end if;
end;
$$;

drop function public.create_memory_comment(uuid, uuid, text, text);

create function public.create_memory_comment(p_memory_id uuid, p_body text)
returns table (
  comment_id uuid, memory_id uuid, space_id uuid, author_user_id uuid,
  author_display_name text, body text, created_at timestamptz, outcome text
) language plpgsql security definer set search_path = '' as $$
declare
  membership public.space_members := private.active_membership();
  comment public.memory_comments;
  normalized_body text := btrim(p_body);
begin
  if membership.id is null or not exists (select 1 from public.memories as memory
      where memory.id = p_memory_id and memory.space_id = membership.space_id
        and memory.deleted_at is null) then
    return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::timestamptz, 'unavailable'::text; return;
  end if;
  if char_length(normalized_body) not between 1 and 1000 then
    return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::timestamptz, 'invalid'::text; return;
  end if;
  insert into public.memory_comments (memory_id, space_id, author_membership_id, body)
  values (p_memory_id, membership.space_id, membership.id, normalized_body)
  returning * into comment;
  return query select comment.id, comment.memory_id, comment.space_id, membership.user_id,
    membership.display_name, comment.body, comment.created_at, 'completed'::text;
end;
$$;

drop index public.memories_creator_mutation_unique;
drop index public.memories_creator_user_id;
alter table public.memories drop constraint memories_creator_membership_fkey;
alter table public.memories drop column creator_user_id;
alter table public.memories add constraint memories_creator_membership_fkey
  foreign key (creator_membership_id, space_id)
  references public.space_members (id, space_id) on delete restrict;
create unique index memories_creator_mutation_unique
on public.memories (creator_membership_id, creation_mutation_id)
where creation_mutation_id is not null;

alter table public.memory_comments
  drop constraint memory_comments_author_key_unique,
  drop constraint memory_comments_fingerprint_format,
  drop constraint memory_comments_author_fkey,
  drop column author_user_id,
  drop column idempotency_key,
  drop column request_fingerprint;
alter table public.memory_comments add constraint memory_comments_author_fkey
  foreign key (author_membership_id, space_id)
  references public.space_members (id, space_id) on delete restrict;

revoke execute on function public.create_memory_comment(uuid, text)
from public, anon, authenticated, service_role;
grant execute on function public.create_memory_comment(uuid, text) to authenticated;
