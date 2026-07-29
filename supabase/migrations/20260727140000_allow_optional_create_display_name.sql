create or replace function public.create_space(
  p_space_name text,
  p_display_name text,
  p_start_date date,
  p_timezone text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_space public.spaces%rowtype;
  generated_invite_code text;
  profile_display_name text;
  fallback_display_name constant text := 'Leonly User';
  trimmed_display_name text := pg_catalog.btrim(p_display_name);
  trimmed_space_name text := pg_catalog.btrim(p_space_name);
begin
  if current_user_id is null then
    raise exception using errcode = 'L1001', message = 'Authentication is required.';
  end if;

  if trimmed_space_name is null or pg_catalog.char_length(trimmed_space_name) not between 2 and 100 then
    raise exception using errcode = 'L1002', message = 'Space name must contain 2 to 100 characters.';
  end if;

  if trimmed_display_name is not null
    and trimmed_display_name <> ''
    and pg_catalog.char_length(trimmed_display_name) not between 2 and 100 then
    raise exception using errcode = 'L1002', message = 'Your name must contain 2 to 100 characters.';
  end if;

  if p_start_date is null then
    raise exception using errcode = 'L1002', message = 'Start date is required.';
  end if;

  if p_timezone is null or not exists(
    select 1 from pg_catalog.pg_timezone_names where name = p_timezone
  ) then
    raise exception using errcode = 'L1002', message = 'Enter a valid timezone.';
  end if;

  if p_start_date > (current_timestamp at time zone p_timezone)::date then
    raise exception using errcode = 'L1002', message = 'The start date cannot be in the future.';
  end if;

  select pg_catalog.btrim(name)
  into profile_display_name
  from public.users
  where id = current_user_id
  for update;

  if not found then
    raise exception using
      errcode = 'L1004',
      message = 'The current user profile must exist before creating a space.';
  end if;

  if trimmed_display_name is null or trimmed_display_name = '' then
    trimmed_display_name := profile_display_name;
  end if;

  if trimmed_display_name is null
    or pg_catalog.char_length(trimmed_display_name) not between 2 and 100 then
    trimmed_display_name := fallback_display_name;
  end if;

  if exists(
    select 1
    from public.space_members
    where user_id = current_user_id
      and is_active = true
  ) then
    raise exception using errcode = 'L1003', message = 'You already belong to an active space.';
  end if;

  for attempt in 1..10 loop
    generated_invite_code := public.generate_space_invite_code();

    begin
      insert into public.spaces (
        created_by_user_id,
        invite_code,
        is_active,
        name,
        start_date,
        updated_by_user_id
      )
      values (
        current_user_id,
        generated_invite_code,
        true,
        trimmed_space_name,
        p_start_date,
        current_user_id
      )
      returning * into created_space;

      exit;
    exception
      when unique_violation then
        if attempt = 10 then
          raise exception using
            errcode = 'L1005',
            message = 'We could not generate a unique invite code. Please try again.';
        end if;
    end;
  end loop;

  insert into public.space_members (
    display_name,
    is_active,
    onboarding_completed_at,
    role,
    space_id,
    user_id
  )
  values (
    trimmed_display_name,
    true,
    pg_catalog.clock_timestamp(),
    'owner',
    created_space.id,
    current_user_id
  );

  return pg_catalog.jsonb_build_object(
    'id', created_space.id,
    'invite_code', created_space.invite_code
  );
end;
$$;

revoke execute on function public.create_space(text, text, date, text) from public;
revoke execute on function public.create_space(text, text, date, text) from anon;
grant execute on function public.create_space(text, text, date, text) to authenticated;
