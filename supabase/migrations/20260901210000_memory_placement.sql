create or replace function public.place_memory(
  p_actor_user_id uuid,
  p_memory_id uuid,
  p_target_visibility public.memory_visibility,
  p_expected_updated_at timestamptz
)
returns table (
  memory_id uuid,
  outcome text,
  result_visibility public.memory_visibility,
  result_updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_space_id uuid;
  v_memory public.memories;
  v_result_updated_at timestamptz;
begin
  perform private.require_service_role();

  v_space_id := private.available_space_for_user(p_actor_user_id);
  if v_space_id is null then
    return query select null::uuid, 'unavailable'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  select * into v_memory
  from public.memories as memory
  where memory.id = p_memory_id
    and memory.space_id = v_space_id
    and memory.deleted_at is null
  for update;

  if not found or v_memory.visibility = p_target_visibility then
    return query select null::uuid, 'unavailable'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  if v_memory.updated_at <> p_expected_updated_at then
    return query select null::uuid, 'conflict'::text,
      null::public.memory_visibility, null::timestamptz;
    return;
  end if;

  update public.memories
  set visibility = p_target_visibility
  where id = v_memory.id
  returning updated_at into v_result_updated_at;

  return query select v_memory.id, 'completed'::text, p_target_visibility, v_result_updated_at;
end;
$$;

revoke all on function public.place_memory(uuid, uuid, public.memory_visibility, timestamptz)
from public, anon, authenticated;

grant execute on function public.place_memory(uuid, uuid, public.memory_visibility, timestamptz)
to service_role;
