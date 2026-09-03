create table public.memory_reactions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.space_members(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint memory_reactions_type_check
    check (reaction_type in ('heart', 'laugh', 'cry', 'star')),
  constraint memory_reactions_membership_memory_unique
    unique (membership_id, memory_id)
);

create index memory_reactions_memory_id_idx on public.memory_reactions (memory_id);

revoke all on table public.memory_reactions from public, anon, authenticated;

alter table public.memory_reactions enable row level security;

create or replace function public.get_memory_reaction_summary(
  p_user_id uuid,
  p_memory_id uuid
)
returns table (
  current_reaction text,
  heart_count bigint,
  laugh_count bigint,
  cry_count bigint,
  star_count bigint,
  outcome text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_space_id uuid;
  v_membership public.space_members;
begin
  perform private.require_service_role();

  v_space_id := private.available_space_for_user(p_user_id);
  if v_space_id is null then
    return query select null::text, null::bigint, null::bigint, null::bigint, null::bigint,
      'unavailable'::text;
    return;
  end if;

  select member.* into v_membership
  from public.space_members as member
  where member.user_id = p_user_id
    and member.space_id = v_space_id
    and member.deleted_at is null
  ;

  if not found or p_memory_id is null or not exists (
    select 1
    from public.memories as memory
    where memory.id = p_memory_id
      and memory.space_id = v_membership.space_id
      and memory.deleted_at is null
  ) then
    return query select null::text, null::bigint, null::bigint, null::bigint, null::bigint,
      'unavailable'::text;
    return;
  end if;

  return query
  select
    max(reaction.reaction_type) filter (where reaction.membership_id = v_membership.id),
    count(*) filter (where reaction.reaction_type = 'heart'),
    count(*) filter (where reaction.reaction_type = 'laugh'),
    count(*) filter (where reaction.reaction_type = 'cry'),
    count(*) filter (where reaction.reaction_type = 'star'),
    'completed'::text
  from public.memory_reactions as reaction
  where reaction.memory_id = p_memory_id;
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
  outcome text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_space_id uuid;
  v_membership public.space_members;
  v_reaction public.memory_reactions;
begin
  perform private.require_service_role();

  v_space_id := private.available_space_for_user(p_user_id);
  if v_space_id is null then
    return query select null::text, null::bigint, null::bigint, null::bigint, null::bigint,
      'unavailable'::text;
    return;
  end if;

  select member.* into v_membership
  from public.space_members as member
  where member.user_id = p_user_id
    and member.space_id = v_space_id
    and member.deleted_at is null
  ;

  if not found or p_memory_id is null or p_reaction_type not in ('heart', 'laugh', 'cry', 'star')
    or not exists (
      select 1
      from public.memories as memory
      where memory.id = p_memory_id
        and memory.space_id = v_membership.space_id
        and memory.deleted_at is null
    ) then
    return query select null::text, null::bigint, null::bigint, null::bigint, null::bigint,
      'unavailable'::text;
    return;
  end if;

  loop
    select reaction.* into v_reaction
    from public.memory_reactions as reaction
    where reaction.membership_id = v_membership.id
      and reaction.memory_id = p_memory_id
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
    values (v_membership.id, p_memory_id, p_reaction_type)
    on conflict (membership_id, memory_id) do nothing
    returning * into v_reaction;

    if found then
      exit;
    end if;
  end loop;

  return query
  select
    max(reaction.reaction_type) filter (where reaction.membership_id = v_membership.id),
    count(*) filter (where reaction.reaction_type = 'heart'),
    count(*) filter (where reaction.reaction_type = 'laugh'),
    count(*) filter (where reaction.reaction_type = 'cry'),
    count(*) filter (where reaction.reaction_type = 'star'),
    'completed'::text
  from public.memory_reactions as reaction
  where reaction.memory_id = p_memory_id;
end;
$$;

revoke all on function public.get_memory_reaction_summary(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.get_memory_reaction_summary(uuid, uuid) to service_role;

revoke all on function public.toggle_memory_reaction(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.toggle_memory_reaction(uuid, uuid, text) to service_role;
