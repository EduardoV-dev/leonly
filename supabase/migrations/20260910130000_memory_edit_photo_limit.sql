do $$
declare
  function_definition text;
begin
  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure(
      'public.finalize_memory_edit_attempt(uuid,text,text,text,date,text,public.memory_visibility,uuid[],uuid)'
    )
  )
  into function_definition;

  if function_definition is null then
    raise exception 'The memory edit finalization function does not exist';
  end if;

  if position('v_retained_count + v_staged_count > 5' in function_definition) = 0 then
    raise exception 'The memory edit photo limit was already changed or is unexpected';
  end if;

  execute replace(
    function_definition,
    'v_retained_count + v_staged_count > 5',
    'v_retained_count + v_staged_count > 10'
  );
end;
$$;
