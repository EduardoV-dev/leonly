create function public.delete_memory(
  p_actor_user_id uuid,
  p_memory_id text,
  p_expected_updated_at timestamptz
)
returns table (outcome text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.space_members;
  v_memory_id uuid;
  v_memory public.memories;
begin
  perform private.require_service_role();

  select member.* into v_membership
  from public.space_members as member
  inner join public.spaces as space on space.id = member.space_id
  inner join public.users as profile on profile.id = member.user_id
  where member.user_id = p_actor_user_id
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
  for update of member;

  if not found or p_memory_id is null or p_expected_updated_at is null then
    return query select 'unavailable'::text;
    return;
  end if;

  begin
    v_memory_id := p_memory_id::uuid;
  exception when invalid_text_representation then
    return query select 'unavailable'::text;
    return;
  end;

  select memory.* into v_memory
  from public.memories as memory
  where memory.id = v_memory_id
    and memory.space_id = v_membership.space_id
  for update;

  if not found or v_memory.deleted_at is not null then
    return query select 'unavailable'::text;
    return;
  end if;

  if v_memory.updated_at <> p_expected_updated_at then
    return query select 'conflict'::text;
    return;
  end if;

  update public.memories as memory
  set deleted_at = timezone('utc', now())
  where memory.id = v_memory.id
    and memory.deleted_at is null;

  return query select 'completed'::text;
end;
$$;

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
  v_membership public.space_members;
  v_memory public.memories;
  v_body text;
  v_existing public.memory_comments;
  v_comment public.memory_comments;
  v_author_display_name text;
  v_inserted_count integer;
begin
  perform private.require_service_role();

  select member.* into v_membership
  from public.space_members as member
  inner join public.spaces as space on space.id = member.space_id
  inner join public.users as profile on profile.id = member.user_id
  where member.user_id = p_author_user_id
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
  for update of member;

  if not found then
    return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::timestamptz, 'unavailable'::text;
    return;
  end if;

  select memory.* into v_memory
  from public.memories as memory
  where memory.id = p_memory_id
    and memory.space_id = v_membership.space_id
  for update;

  if not found or v_memory.deleted_at is not null then
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
      v_membership.space_id
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
  v_membership public.space_members;
  v_memory public.memories;
  v_body text;
  v_comment public.memory_comments;
  v_author_display_name text;
begin
  perform private.require_service_role();

  select member.* into v_membership
  from public.space_members as member
  inner join public.spaces as space on space.id = member.space_id
  inner join public.users as profile on profile.id = member.user_id
  where member.user_id = p_author_user_id
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
  for update of member;

  if not found then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'unavailable'::text;
    return;
  end if;

  select memory.* into v_memory
  from public.memories as memory
  where memory.id = p_memory_id
    and memory.space_id = v_membership.space_id
  for update;

  if not found or v_memory.deleted_at is not null then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'unavailable'::text;
    return;
  end if;

  select comment.* into v_comment
  from public.memory_comments as comment
  where comment.id = p_comment_id
    and comment.memory_id = v_memory.id
    and comment.space_id = v_membership.space_id
    and comment.deleted_at is null
  for update;

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
  v_membership public.space_members;
  v_memory public.memories;
  v_comment public.memory_comments;
begin
  perform private.require_service_role();

  select member.* into v_membership
  from public.space_members as member
  inner join public.spaces as space on space.id = member.space_id
  inner join public.users as profile on profile.id = member.user_id
  where member.user_id = p_author_user_id
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
  for update of member;

  if not found or p_expected_version is null or p_expected_version < 1 then
    return query select 'unavailable'::text;
    return;
  end if;

  select memory.* into v_memory
  from public.memories as memory
  where memory.id = p_memory_id
    and memory.space_id = v_membership.space_id
  for update;

  if not found or v_memory.deleted_at is not null then
    return query select 'unavailable'::text;
    return;
  end if;

  select comment.* into v_comment
  from public.memory_comments as comment
  where comment.id = p_comment_id
    and comment.memory_id = v_memory.id
    and comment.space_id = v_membership.space_id
    and comment.deleted_at is null
  for update;

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

create or replace function public.toggle_memory_reaction(
  p_user_id uuid,
  p_memory_id uuid,
  p_reaction_type text
)
returns table (
  current_reaction text,
  heart_count bigint,
  laugh_count bigint,
  cry_count bigint,
  star_count bigint,
  reaction_members jsonb,
  outcome text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.space_members;
  v_memory public.memories;
  v_reaction public.memory_reactions;
begin
  perform private.require_service_role();

  select member.* into v_membership
  from public.space_members as member
  inner join public.spaces as space on space.id = member.space_id
  inner join public.users as profile on profile.id = member.user_id
  where member.user_id = p_user_id
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
  for update of member;

  if not found then
    return query select null::text, null::bigint, null::bigint, null::bigint, null::bigint,
      null::jsonb, 'unavailable'::text;
    return;
  end if;

  select memory.* into v_memory
  from public.memories as memory
  where memory.id = p_memory_id
    and memory.space_id = v_membership.space_id
  for update;

  if not found or v_memory.deleted_at is not null
    or p_reaction_type not in ('heart', 'laugh', 'cry', 'star') then
    return query select null::text, null::bigint, null::bigint, null::bigint, null::bigint,
      null::jsonb, 'unavailable'::text;
    return;
  end if;

  loop
    select reaction.* into v_reaction
    from public.memory_reactions as reaction
    where reaction.membership_id = v_membership.id
      and reaction.memory_id = v_memory.id
    for update;

    if found then
      if v_reaction.reaction_type = p_reaction_type then
        delete from public.memory_reactions as reaction where reaction.id = v_reaction.id;
      else
        update public.memory_reactions as reaction
        set reaction_type = p_reaction_type,
          updated_at = timezone('utc', now())
        where reaction.id = v_reaction.id;
      end if;
      exit;
    end if;

    insert into public.memory_reactions (membership_id, memory_id, reaction_type)
    values (v_membership.id, v_memory.id, p_reaction_type)
    on conflict (membership_id, memory_id) do nothing
    returning * into v_reaction;

    if found then
      exit;
    end if;
  end loop;

  return query select * from public.get_memory_reaction_summary(p_user_id, v_memory.id);
end;
$$;

revoke all on function public.delete_memory(uuid, text, timestamptz)
from public, anon, authenticated;
grant execute on function public.delete_memory(uuid, text, timestamptz) to service_role;

revoke all on function public.create_memory_comment(uuid, uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.create_memory_comment(uuid, uuid, uuid, text, text)
to service_role;

revoke all on function public.update_memory_comment(uuid, uuid, uuid, integer, text)
from public, anon, authenticated;
grant execute on function public.update_memory_comment(uuid, uuid, uuid, integer, text)
to service_role;

revoke all on function public.delete_memory_comment(uuid, uuid, uuid, integer)
from public, anon, authenticated;
grant execute on function public.delete_memory_comment(uuid, uuid, uuid, integer)
to service_role;

revoke all on function public.toggle_memory_reaction(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.toggle_memory_reaction(uuid, uuid, text) to service_role;
