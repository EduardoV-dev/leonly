create index memories_vault_eligible_idx
  on public.memories (space_id, memory_date desc, created_at desc, id desc)
  where visibility = 'vault'
    and deleted_at is null;
