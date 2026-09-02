create or replace function public.create_memory_comment(
  p_author_user_id uuid,
  p_memory_id uuid,
  p_idempotency_key uuid,
  p_body text,
  p_request_fingerprint text
)
returns table (
  comment_id uuid,
  memory_id uuid,
  space_id uuid,
  author_user_id uuid,
  author_display_name text,
  body text,
  created_at timestamptz,
  outcome text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_space_id uuid;
  v_body text;
  v_existing public.memory_comments;
  v_comment public.memory_comments;
  v_author_display_name text;
  v_inserted_count integer;
begin
  perform private.require_service_role();

  v_space_id := private.available_space_for_user(p_author_user_id);
  if v_space_id is null then
    return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::timestamptz, 'unavailable'::text;
    return;
  end if;

  if p_memory_id is null or not exists (
    select 1
    from public.memories as memory
    where memory.id = p_memory_id
      and memory.space_id = v_space_id
      and memory.deleted_at is null
  ) then
    return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::timestamptz, 'unavailable'::text;
    return;
  end if;

  v_body := pg_catalog.btrim(p_body);
  if p_body is null or pg_catalog.char_length(v_body) not between 1 and 1000
    or p_idempotency_key is null
    or p_request_fingerprint is null
    or pg_catalog.btrim(p_request_fingerprint) !~ '^[a-f0-9]{64}$' then
    return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::timestamptz, 'invalid'::text;
    return;
  end if;

  select * into v_existing
  from public.memory_comments as comment
  where comment.author_user_id = p_author_user_id
    and comment.idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_existing.request_fingerprint <> pg_catalog.btrim(p_request_fingerprint) then
      return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
        null::text, null::timestamptz, 'mismatch'::text;
      return;
    end if;

    if v_existing.deleted_at is not null then
      return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
        null::text, null::timestamptz, 'unavailable'::text;
      return;
    end if;

    v_comment := v_existing;
  else
    insert into public.memory_comments (
      author_user_id,
      body,
      idempotency_key,
      memory_id,
      request_fingerprint,
      space_id
    )
    values (
      p_author_user_id,
      v_body,
      p_idempotency_key,
      p_memory_id,
      pg_catalog.btrim(p_request_fingerprint),
      v_space_id
    )
    on conflict on constraint memory_comments_author_key_unique do nothing
    returning * into v_comment;

    get diagnostics v_inserted_count = row_count;
    if v_inserted_count = 0 then
      select * into v_existing
      from public.memory_comments as comment
      where comment.author_user_id = p_author_user_id
        and comment.idempotency_key = p_idempotency_key
      for update;

      if not found or v_existing.request_fingerprint <> pg_catalog.btrim(p_request_fingerprint)
        or v_existing.deleted_at is not null then
        return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
          null::text, null::timestamptz,
          case when found then 'mismatch' else 'unavailable' end::text;
        return;
      end if;

      v_comment := v_existing;
    end if;
  end if;

  select member.display_name into v_author_display_name
  from public.space_members as member
  where member.space_id = v_comment.space_id
    and member.user_id = v_comment.author_user_id
    and member.deleted_at is null;

  if v_author_display_name is null then
    return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::timestamptz, 'unavailable'::text;
    return;
  end if;

  return query select v_comment.id, v_comment.memory_id, v_comment.space_id,
    v_comment.author_user_id, v_author_display_name, v_comment.body, v_comment.created_at,
    'completed'::text;
end;
$$;
