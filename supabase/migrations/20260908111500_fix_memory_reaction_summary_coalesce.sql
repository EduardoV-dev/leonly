create or replace function public.get_memory_reaction_summary(p_memory_id uuid)
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
begin
  v_membership := private.active_membership();
  if v_membership.id is null or p_memory_id is null or not exists (
    select 1
    from public.memories as memory
    where memory.id = p_memory_id
      and memory.space_id = v_membership.space_id
      and memory.deleted_at is null
  ) then
    return query select null::text, null::bigint, null::bigint, null::bigint,
      null::bigint, null::jsonb, 'unavailable'::text;
    return;
  end if;

  return query
  select
    pg_catalog.max(reaction.reaction_type)
      filter (where reaction.membership_id = v_membership.id),
    pg_catalog.count(*) filter (where reaction.reaction_type = 'heart'),
    pg_catalog.count(*) filter (where reaction.reaction_type = 'laugh'),
    pg_catalog.count(*) filter (where reaction.reaction_type = 'cry'),
    pg_catalog.count(*) filter (where reaction.reaction_type = 'star'),
    pg_catalog.jsonb_build_object(
      'heart', coalesce(
        pg_catalog.jsonb_agg(member.display_name order by member.display_name)
          filter (where reaction.reaction_type = 'heart'),
        '[]'::jsonb
      ),
      'laugh', coalesce(
        pg_catalog.jsonb_agg(member.display_name order by member.display_name)
          filter (where reaction.reaction_type = 'laugh'),
        '[]'::jsonb
      ),
      'cry', coalesce(
        pg_catalog.jsonb_agg(member.display_name order by member.display_name)
          filter (where reaction.reaction_type = 'cry'),
        '[]'::jsonb
      ),
      'star', coalesce(
        pg_catalog.jsonb_agg(member.display_name order by member.display_name)
          filter (where reaction.reaction_type = 'star'),
        '[]'::jsonb
      )
    ),
    'completed'::text
  from public.memory_reactions as reaction
  inner join public.space_members as member
    on member.id = reaction.membership_id
    and member.space_id = v_membership.space_id
    and member.deleted_at is null
  inner join public.users as profile
    on profile.id = member.user_id
    and profile.deleted_at is null
  where reaction.memory_id = p_memory_id;
end;
$$;
