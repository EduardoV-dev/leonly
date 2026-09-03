alter table public.memory_comments
  add column version integer not null default 1,
  add column updated_at timestamptz;

update public.memory_comments
set updated_at = created_at
where updated_at is null;

alter table public.memory_comments
  alter column updated_at set not null,
  alter column updated_at set default timezone('utc', now());

create or replace function public.update_memory_comment(
  p_author_user_id uuid,
  p_memory_id uuid,
  p_comment_id uuid,
  p_expected_version integer,
  p_body text
)
returns table (
  comment_id uuid,
  memory_id uuid,
  author_user_id uuid,
  author_display_name text,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  version integer,
  outcome text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_space_id uuid;
  v_body text;
  v_comment public.memory_comments;
  v_author_display_name text;
begin
  perform private.require_service_role();

  v_space_id := private.available_space_for_user(p_author_user_id);
  if v_space_id is null then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'unavailable'::text;
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
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'unavailable'::text;
    return;
  end if;

  v_body := pg_catalog.btrim(p_body);
  if p_body is null or pg_catalog.char_length(v_body) not between 1 and 1000
    or p_expected_version is null or p_expected_version < 1 then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'invalid'::text;
    return;
  end if;

  if v_comment.version <> p_expected_version then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'conflict'::text;
    return;
  end if;

  update public.memory_comments as comment
  set body = v_body,
    updated_at = timezone('utc', now()),
    version = comment.version + 1
  where comment.id = v_comment.id
  returning * into v_comment;

  select member.display_name into v_author_display_name
  from public.space_members as member
  where member.space_id = v_comment.space_id
    and member.user_id = v_comment.author_user_id
    and member.deleted_at is null;

  if v_author_display_name is null then
    raise exception 'Comment author membership is unavailable';
  end if;

  return query select v_comment.id, v_comment.memory_id, v_comment.author_user_id,
    v_author_display_name, v_comment.body, v_comment.created_at, v_comment.updated_at,
    v_comment.version, 'completed'::text;
end;
$$;

revoke all on function public.update_memory_comment(uuid, uuid, uuid, integer, text)
from public, anon, authenticated;
grant execute on function public.update_memory_comment(uuid, uuid, uuid, integer, text)
to service_role;
