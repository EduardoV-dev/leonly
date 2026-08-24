create type public.memory_visibility as enum ('timeline', 'vault');

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete restrict,
  creator_user_id uuid not null references public.users(id) on delete restrict,
  title text not null,
  description text,
  location text,
  memory_date date not null,
  visibility public.memory_visibility not null default 'timeline',
  deleted_at timestamptz,
  cover_photo_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint memories_title_not_blank_check
    check (char_length(btrim(title)) > 0)
);

create table public.memory_photos (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  object_path text not null,
  position integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint memory_photos_object_path_not_blank_check
    check (char_length(btrim(object_path)) > 0),

  constraint memory_photos_position_nonnegative_check
    check (position >= 0),

  constraint memory_photos_memory_position_unique
    unique (memory_id, position),

  constraint memory_photos_id_memory_unique
    unique (id, memory_id)
);

alter table public.memories
  add constraint memories_cover_photo_same_memory_fkey
  foreign key (cover_photo_id, id)
  references public.memory_photos (id, memory_id)
  on delete restrict;

create index memories_space_id_idx on public.memories (space_id);

create index memories_creator_user_id_idx on public.memories (creator_user_id);

create index memories_cover_photo_id_idx
  on public.memories (cover_photo_id, id)
  where cover_photo_id is not null;

create index memories_timeline_eligible_idx
  on public.memories (space_id, memory_date desc, created_at desc, id desc)
  where visibility = 'timeline'
    and deleted_at is null;

create trigger set_memories_updated_at
before update on public.memories
for each row
execute function public.set_updated_at();

create trigger set_memory_photos_updated_at
before update on public.memory_photos
for each row
execute function public.set_updated_at();

revoke all on table public.memories from public;
revoke all on table public.memories from anon;
revoke all on table public.memory_photos from public;
revoke all on table public.memory_photos from anon;

grant select on table public.memories to authenticated;
grant select on table public.memory_photos to authenticated;

create schema if not exists private;

create or replace function private.is_available_space_member(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.space_members as member
    inner join public.spaces as space on space.id = member.space_id
    where member.space_id = p_space_id
      and member.user_id = (select auth.uid())
      and member.deleted_at is null
      and space.deleted_at is null
      and exists (
        select 1
        from public.users as profile
        where profile.id = member.user_id
          and profile.deleted_at is null
      )
  );
$$;

revoke all on function private.is_available_space_member(uuid) from public;
revoke all on function private.is_available_space_member(uuid) from anon;
grant execute on function private.is_available_space_member(uuid) to authenticated;

alter table public.memories enable row level security;
alter table public.memory_photos enable row level security;

create policy "Available space members can view available memories"
on public.memories
for select
to authenticated
using (
  deleted_at is null
  and (select private.is_available_space_member(space_id))
);

create policy "Available space members can view available memory photos"
on public.memory_photos
for select
to authenticated
using (
  exists (
    select 1
    from public.memories as memory
    where memory.id = memory_photos.memory_id
      and memory.deleted_at is null
  )
);

insert into storage.buckets (id, name, public)
values ('memory-photos', 'memory-photos', false);

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
    where photo.object_path = storage.objects.name
      and storage.objects.name like space.id::text || '/%'
      and memory.deleted_at is null
      and space.deleted_at is null
      and member.user_id = (select auth.uid())
      and member.deleted_at is null
      and profile.deleted_at is null
  )
);

create or replace function public.get_available_memory(p_memory_id uuid)
returns public.memories
language sql
stable
security invoker
set search_path = ''
as $$
  select memory
  from public.memories as memory
  where memory.id = p_memory_id;
$$;

revoke execute on function public.get_available_memory(uuid) from public;
revoke execute on function public.get_available_memory(uuid) from anon;
grant execute on function public.get_available_memory(uuid) to authenticated;
