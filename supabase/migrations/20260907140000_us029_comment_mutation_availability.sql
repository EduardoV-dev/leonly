create function public.can_mutate_memory_comment(
  p_memory_id uuid,
  p_comment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memory_comments as comment
    inner join public.memories as memory
      on memory.id = comment.memory_id
      and memory.space_id = comment.space_id
    inner join public.space_members as membership
      on membership.id = comment.author_membership_id
      and membership.space_id = comment.space_id
    inner join public.spaces as space on space.id = membership.space_id
    inner join public.users as profile on profile.id = membership.user_id
    where comment.id = p_comment_id
      and comment.memory_id = p_memory_id
      and membership.user_id = (select auth.uid())
      and comment.deleted_at is null
      and memory.deleted_at is null
      and membership.deleted_at is null
      and space.deleted_at is null
      and profile.deleted_at is null
  );
$$;

revoke all on function public.can_mutate_memory_comment(uuid, uuid)
from public, anon, authenticated, service_role;
grant execute on function public.can_mutate_memory_comment(uuid, uuid) to authenticated;
