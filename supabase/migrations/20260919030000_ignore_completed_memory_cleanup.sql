create or replace function public.get_memory_edit_result(
  p_actor_subject text,
  p_mutation_id uuid,
  p_memory_id uuid,
  p_space_id uuid,
  p_expected_updated_at timestamptz,
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
    return jsonb_build_object('status', 'unavailable', 'memory_id', null,
      'visibility', null, 'updated_at', null);
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_actor_subject || ':' || p_mutation_id::text, 0)
  );
  select * into memory from public.memories where id = p_memory_id
    and space_id = membership.space_id and deleted_at is null;
  if not found then return jsonb_build_object('status', 'unavailable', 'memory_id', null,
    'visibility', null, 'updated_at', null); end if;

  if memory.last_edit_mutation_id = p_mutation_id then
    if memory.last_edit_actor_user_id <> membership.user_id
      or memory.last_edit_expected_updated_at <> p_expected_updated_at
      or memory.title <> btrim(p_title)
      or memory.description is distinct from nullif(btrim(p_description), '')
      or memory.location is distinct from nullif(btrim(p_location), '')
      or memory.memory_date <> p_memory_date or memory.visibility <> p_visibility
      or jsonb_typeof(p_assets) <> 'array'
      or (select count(*) from public.memory_assets where memory_id = memory.id)
        <> jsonb_array_length(p_assets)
      or exists (
        select 1 from jsonb_array_elements(p_assets) as entry
        where not exists (select 1 from public.memory_assets as asset
          where asset.memory_id = memory.id and asset.id = (entry->>'asset_id')::uuid
            and asset.position = (entry->>'position')::smallint
            and ((entry->>'is_cover')::boolean = (memory.cover_asset_id = asset.id)))
      ) then return jsonb_build_object('status', 'mismatch', 'memory_id', null,
        'visibility', null, 'updated_at', null);
    end if;
    return jsonb_build_object('status', 'completed', 'memory_id', memory.id,
      'visibility', memory.visibility, 'updated_at', memory.updated_at);
  end if;
  if memory.updated_at <> p_expected_updated_at then
    return jsonb_build_object('status', 'conflict', 'memory_id', null,
      'visibility', null, 'updated_at', null);
  end if;
  if p_mutation_id is null or p_expected_updated_at is null
    or char_length(btrim(p_title)) not between 1 and 120
    or char_length(btrim(coalesce(p_description, ''))) > 2000
    or char_length(btrim(coalesce(p_location, ''))) > 150
    or p_memory_date is null or p_visibility is null
    or not private.memory_edit_selection_is_valid(
      p_space_id, p_memory_id, p_mutation_id, p_assets, false
    ) then return jsonb_build_object('status', 'invalid', 'memory_id', null,
      'visibility', null, 'updated_at', null);
  end if;
  if exists (
    select 1 from public.resource_cleanup as cleanup
    where cleanup.cleaned_at is null and cleanup.resource_kind = 'storage_object'
      and (
        cleanup.resource_locator like
          p_space_id::text || '/temporary/' || p_mutation_id::text || '/%'
        or exists (
          select 1 from jsonb_array_elements(p_assets) as entry
          where (entry->>'is_new')::boolean
            and cleanup.resource_locator in (
              entry->>'original_path', entry->>'cover_path', entry->>'detail_path'
            )
        )
      )
  ) then
    return jsonb_build_object('status', 'cleanup_pending', 'memory_id', null,
      'visibility', null, 'updated_at', null);
  end if;
  return jsonb_build_object('status', 'pending', 'memory_id', null,
    'visibility', null, 'updated_at', null);
exception when invalid_text_representation then
  return jsonb_build_object('status', 'invalid', 'memory_id', null,
    'visibility', null, 'updated_at', null);
end;
$$;

create or replace function public.finalize_memory_edit(
  p_actor_subject text,
  p_mutation_id uuid,
  p_memory_id uuid,
  p_space_id uuid,
  p_expected_updated_at timestamptz,
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
  selected jsonb;
  asset_id uuid;
  cover_id uuid;
begin
  if membership.id is null or membership.space_id <> p_space_id then
    return jsonb_build_object('status', 'unavailable', 'memory_id', null,
      'visibility', null, 'updated_at', null);
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_actor_subject || ':' || p_mutation_id::text, 0)
  );
  select * into memory from public.memories where id = p_memory_id
    and space_id = membership.space_id and deleted_at is null for update;
  if not found then return jsonb_build_object('status', 'unavailable', 'memory_id', null,
    'visibility', null, 'updated_at', null); end if;
  if memory.last_edit_mutation_id = p_mutation_id then
    return public.get_memory_edit_result(p_actor_subject, p_mutation_id, p_memory_id,
      p_space_id, p_expected_updated_at, p_title, p_description, p_location,
      p_memory_date, p_visibility, p_assets);
  end if;
  if memory.updated_at <> p_expected_updated_at then
    return jsonb_build_object('status', 'conflict', 'memory_id', null,
      'visibility', null, 'updated_at', null);
  end if;
  if p_mutation_id is null or p_expected_updated_at is null
    or char_length(btrim(p_title)) not between 1 and 120
    or char_length(btrim(coalesce(p_description, ''))) > 2000
    or char_length(btrim(coalesce(p_location, ''))) > 150
    or p_memory_date is null or p_visibility is null
    or not private.memory_edit_selection_is_valid(
      p_space_id, p_memory_id, p_mutation_id, p_assets, true
    ) then return jsonb_build_object('status', 'invalid', 'memory_id', null,
      'visibility', null, 'updated_at', null);
  end if;
  if exists (
    select 1 from public.resource_cleanup as cleanup
    where cleanup.cleaned_at is null and cleanup.resource_kind = 'storage_object'
      and (
        cleanup.resource_locator like
          p_space_id::text || '/temporary/' || p_mutation_id::text || '/%'
        or exists (
          select 1 from jsonb_array_elements(p_assets) as entry
          where (entry->>'is_new')::boolean
            and cleanup.resource_locator in (
              entry->>'original_path', entry->>'cover_path', entry->>'detail_path'
            )
        )
      )
  ) then
    return jsonb_build_object('status', 'cleanup_pending', 'memory_id', null,
      'visibility', null, 'updated_at', null);
  end if;

  insert into public.resource_cleanup (resource_kind, resource_locator)
  select 'storage_object', object.object_path
  from public.memory_assets as asset
  inner join public.memory_asset_objects as object on object.asset_id = asset.id
  where asset.memory_id = memory.id and not exists (
    select 1 from jsonb_array_elements(p_assets) as entry
    where (entry->>'asset_id')::uuid = asset.id
  ) on conflict (resource_kind, resource_locator) do nothing;
  update public.memories set cover_asset_id = null where id = memory.id;
  delete from public.memory_assets as asset where asset.memory_id = memory.id and not exists (
    select 1 from jsonb_array_elements(p_assets) as entry
    where (entry->>'asset_id')::uuid = asset.id
  );
  update public.memory_assets set position = position + 1000 where memory_id = memory.id;

  for selected in select value from jsonb_array_elements(p_assets) loop
    asset_id := (selected->>'asset_id')::uuid;
    if (selected->>'is_new')::boolean then
      insert into public.memory_assets (id, space_id, memory_id, position)
      values (asset_id, membership.space_id, memory.id, (selected->>'position')::smallint);
      insert into public.memory_asset_objects (
        asset_id, variant_type, object_path, status, content_type, byte_size, ready_at
      ) values
        (asset_id, 'original', selected->>'original_path', 'ready',
          selected->>'original_content_type', (selected->>'original_byte_size')::bigint,
          pg_catalog.clock_timestamp()),
        (asset_id, 'cover', selected->>'cover_path', 'ready', 'image/webp',
          (selected->>'cover_byte_size')::bigint, pg_catalog.clock_timestamp()),
        (asset_id, 'detail', selected->>'detail_path', 'ready', 'image/webp',
          (selected->>'detail_byte_size')::bigint, pg_catalog.clock_timestamp());
    else
      update public.memory_assets set position = (selected->>'position')::smallint
      where id = asset_id and memory_id = memory.id;
    end if;
    if (selected->>'is_cover')::boolean then cover_id := asset_id; end if;
  end loop;

  update public.memories set title = btrim(p_title),
    description = nullif(btrim(p_description), ''), location = nullif(btrim(p_location), ''),
    memory_date = p_memory_date, visibility = p_visibility, cover_asset_id = cover_id,
    last_edit_mutation_id = p_mutation_id, last_edit_actor_user_id = membership.user_id,
    last_edit_expected_updated_at = p_expected_updated_at
  where id = memory.id returning * into memory;
  insert into public.resource_cleanup (resource_kind, resource_locator, cleanup_after)
  select 'storage_object', value->>'temporary_path', pg_catalog.clock_timestamp() + interval '15 minutes'
  from jsonb_array_elements(p_assets) where (value->>'is_new')::boolean
  on conflict (resource_kind, resource_locator) do nothing;
  return jsonb_build_object('status', 'completed', 'memory_id', memory.id,
    'visibility', memory.visibility, 'updated_at', memory.updated_at);
exception when unique_violation or check_violation or foreign_key_violation
  or invalid_text_representation then
  return jsonb_build_object('status', 'invalid', 'memory_id', null,
    'visibility', null, 'updated_at', null);
end;
$$;
