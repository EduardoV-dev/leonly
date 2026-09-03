create or replace function public.delete_memory_comment(
  p_author_user_id uuid,
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
  v_space_id uuid;
  v_comment public.memory_comments;
begin
  perform private.require_service_role();

  v_space_id := private.available_space_for_user(p_author_user_id);
  if v_space_id is null or p_expected_version is null or p_expected_version < 1 then
    return query select 'unavailable'::text;
    return;
  end if;

  select comment.* into v_comment
  from public.memory_comments as comment
  join public.memories as memory
    on memory.id = comment.memory_id
    and memory.space_id = comment.space_id
  where comment.id = p_comment_id
    and comment.memory_id = p_memory_id
    and comment.space_id = v_space_id
    and comment.deleted_at is null
    and memory.deleted_at is null
  for update of comment;

  if not found or v_comment.author_user_id <> p_author_user_id then
    return query select 'unavailable'::text;
    return;
  end if;

  if v_comment.version <> p_expected_version then
    return query select 'conflict'::text;
    return;
  end if;

  update public.memory_comments as comment
  set deleted_at = timezone('utc', now())
  where comment.id = v_comment.id;

  return query select 'completed'::text;
end;
$$;

revoke all on function public.delete_memory_comment(uuid, uuid, uuid, integer)
from public, anon, authenticated;
grant execute on function public.delete_memory_comment(uuid, uuid, uuid, integer)
to service_role;
