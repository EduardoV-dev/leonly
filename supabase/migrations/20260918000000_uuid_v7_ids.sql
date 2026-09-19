create function private.uuid_v7()
returns uuid
language sql
volatile
set search_path = pg_catalog
as $$
  select (
    pg_catalog.lpad(
      pg_catalog.to_hex(
        pg_catalog.floor(
          pg_catalog.date_part('epoch', pg_catalog.clock_timestamp()) * 1000
        )::bigint
      ),
      12,
      '0'
    )
    || '7'
    || pg_catalog.substr(
      pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''),
      14
    )
  )::uuid
$$;

revoke execute on function private.uuid_v7() from public, anon, authenticated, service_role;

alter table public.users alter column id set default private.uuid_v7();
alter table public.spaces alter column id set default private.uuid_v7();
alter table public.space_members alter column id set default private.uuid_v7();
alter table public.memories alter column id set default private.uuid_v7();
alter table public.memory_assets alter column id set default private.uuid_v7();
alter table public.memory_asset_objects alter column id set default private.uuid_v7();
alter table public.memory_comments alter column id set default private.uuid_v7();
alter table public.memory_reactions alter column id set default private.uuid_v7();
