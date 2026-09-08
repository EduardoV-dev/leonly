alter table public.space_members
  add constraint space_members_id_user_space_unique unique (id, user_id, space_id),
  add constraint space_members_id_space_unique unique (id, space_id);

alter table public.memories
  add column creator_membership_id uuid;

update public.memories as memory
set creator_membership_id = (
  select membership.id
  from public.space_members as membership
  where membership.user_id = memory.creator_user_id
    and membership.space_id = memory.space_id
  order by membership.deleted_at nulls first, membership.created_at
  limit 1
);

alter table public.memories
  alter column creator_membership_id set not null,
  add constraint memories_creator_membership_fkey
    foreign key (creator_membership_id, creator_user_id, space_id)
    references public.space_members (id, user_id, space_id)
    on delete restrict,
  add constraint memories_title_length_check
    check (pg_catalog.char_length(pg_catalog.btrim(title)) between 1 and 120),
  add constraint memories_description_length_check
    check (description is null or pg_catalog.char_length(pg_catalog.btrim(description)) <= 2000),
  add constraint memories_location_length_check
    check (location is null or pg_catalog.char_length(pg_catalog.btrim(location)) <= 150);

alter table public.memory_creation_attempts
  add column creator_membership_id uuid;

update public.memory_creation_attempts as attempt
set creator_membership_id = (
  select membership.id
  from public.space_members as membership
  where membership.user_id = attempt.creator_user_id
    and membership.space_id = attempt.space_id
  order by membership.deleted_at nulls first, membership.created_at
  limit 1
);

alter table public.memory_creation_attempts
  alter column creator_membership_id set not null,
  add constraint memory_creation_attempts_creator_membership_fkey
    foreign key (creator_membership_id, creator_user_id, space_id)
    references public.space_members (id, user_id, space_id)
    on delete restrict,
  add constraint memory_creation_attempts_memory_space_fkey
    foreign key (memory_id, space_id)
    references public.memories (id, space_id)
    on delete restrict;

alter table public.memory_edit_attempts
  add column editor_membership_id uuid;

update public.memory_edit_attempts as attempt
set editor_membership_id = (
  select membership.id
  from public.space_members as membership
  where membership.user_id = attempt.editor_user_id
    and membership.space_id = attempt.space_id
  order by membership.deleted_at nulls first, membership.created_at
  limit 1
);

alter table public.memory_edit_attempts
  alter column editor_membership_id set not null,
  add constraint memory_edit_attempts_editor_membership_fkey
    foreign key (editor_membership_id, editor_user_id, space_id)
    references public.space_members (id, user_id, space_id)
    on delete restrict,
  add constraint memory_edit_attempts_memory_space_fkey
    foreign key (memory_id, space_id)
    references public.memories (id, space_id)
    on delete restrict;

alter table public.memory_comments
  add column author_membership_id uuid;

update public.memory_comments as comment
set author_membership_id = (
  select membership.id
  from public.space_members as membership
  where membership.user_id = comment.author_user_id
    and membership.space_id = comment.space_id
  order by membership.deleted_at nulls first, membership.created_at
  limit 1
);

alter table public.memory_comments
  alter column author_membership_id set not null,
  add constraint memory_comments_author_membership_fkey
    foreign key (author_membership_id, author_user_id, space_id)
    references public.space_members (id, user_id, space_id)
    on delete restrict,
  add constraint memory_comments_version_positive_check check (version > 0);

alter table public.memory_reactions
  add column space_id uuid;

update public.memory_reactions as reaction
set space_id = memory.space_id
from public.memories as memory
where memory.id = reaction.memory_id;

alter table public.memory_reactions
  alter column space_id set not null,
  add constraint memory_reactions_membership_space_fkey
    foreign key (membership_id, space_id)
    references public.space_members (id, space_id)
    on delete cascade,
  add constraint memory_reactions_memory_space_fkey
    foreign key (memory_id, space_id)
    references public.memories (id, space_id)
    on delete cascade;

create or replace function private.can_view_active_space_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.space_members as current_member
    inner join public.space_members as visible_member
      on visible_member.space_id = current_member.space_id
    inner join public.spaces as space on space.id = current_member.space_id
    inner join public.users as current_profile on current_profile.id = current_member.user_id
    inner join public.users as visible_profile on visible_profile.id = visible_member.user_id
    where current_member.user_id = (select auth.uid())
      and current_member.deleted_at is null
      and visible_member.user_id = p_user_id
      and visible_member.deleted_at is null
      and space.deleted_at is null
      and current_profile.deleted_at is null
      and visible_profile.deleted_at is null
  );
$$;

revoke all on function private.can_view_active_space_profile(uuid)
from public, anon, authenticated, service_role;
grant execute on function private.can_view_active_space_profile(uuid) to authenticated;

create policy "Members can view active profiles in their space"
on public.users
for select
to authenticated
using ((select private.can_view_active_space_profile(id)));

create or replace function private.can_write_memory_photo_object(p_object_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memory_photo_staging as staging
    inner join public.memory_creation_attempts as attempt on attempt.id = staging.attempt_id
    inner join public.space_members as member on member.id = attempt.creator_membership_id
    inner join public.spaces as space on space.id = attempt.space_id
    inner join public.users as profile on profile.id = member.user_id
    where p_object_path in (
        staging.object_path,
        staging.cover_object_path,
        staging.detail_object_path
      )
      and attempt.status = 'processing'
      and member.user_id = (select auth.uid())
      and member.space_id = attempt.space_id
      and member.deleted_at is null
      and space.deleted_at is null
      and profile.deleted_at is null
  ) or exists (
    select 1
    from public.memory_edit_photo_staging as staging
    inner join public.memory_edit_attempts as attempt on attempt.id = staging.attempt_id
    inner join public.space_members as member on member.id = attempt.editor_membership_id
    inner join public.spaces as space on space.id = attempt.space_id
    inner join public.users as profile on profile.id = member.user_id
    inner join public.memories as memory
      on memory.id = attempt.memory_id
      and memory.space_id = attempt.space_id
    where p_object_path in (
        staging.object_path,
        staging.cover_object_path,
        staging.detail_object_path
      )
      and attempt.status = 'processing'
      and member.user_id = (select auth.uid())
      and member.space_id = attempt.space_id
      and member.deleted_at is null
      and space.deleted_at is null
      and profile.deleted_at is null
      and memory.deleted_at is null
  );
$$;

revoke all on function private.can_write_memory_photo_object(text)
from public, anon, authenticated, service_role;
grant execute on function private.can_write_memory_photo_object(text) to authenticated;

create policy "Members can upload staged private memory photo objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'memory-photos'
  and (select private.can_write_memory_photo_object(name))
);

create policy "Members can replace staged private memory photo objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'memory-photos'
  and (select private.can_write_memory_photo_object(name))
)
with check (
  bucket_id = 'memory-photos'
  and (select private.can_write_memory_photo_object(name))
);
