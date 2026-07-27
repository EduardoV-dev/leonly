create or replace function public.generate_space_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  invite_alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  invite_prefixes constant text[] := array['leo', 'lov', 'mem', 'our', 'duo', 'two', 'joy', 'sun', 'lny'];
  random_bytes bytea := pg_catalog.uuid_send(pg_catalog.gen_random_uuid());
  generated_code text;
begin
  generated_code := invite_prefixes[
    1 + (pg_catalog.get_byte(random_bytes, 0) % pg_catalog.cardinality(invite_prefixes))
  ];

  for byte_index in 1..5 loop
    generated_code := generated_code || pg_catalog.substr(
      invite_alphabet,
      1 + (pg_catalog.get_byte(random_bytes, byte_index) % pg_catalog.length(invite_alphabet)),
      1
    );
  end loop;

  return generated_code;
end;
$$;

revoke execute on function public.generate_space_invite_code() from public;
revoke execute on function public.generate_space_invite_code() from anon;
revoke execute on function public.generate_space_invite_code() from authenticated;

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
  trimmed_display_name text := pg_catalog.btrim(p_display_name);
  trimmed_space_name text := pg_catalog.btrim(p_space_name);
begin
  if current_user_id is null then
    raise exception using errcode = 'L1001', message = 'Authentication is required.';
  end if;

  if trimmed_space_name is null or pg_catalog.char_length(trimmed_space_name) not between 2 and 100 then
    raise exception using errcode = 'L1002', message = 'Space name must contain 2 to 100 characters.';
  end if;

  if trimmed_display_name is null
    or pg_catalog.char_length(trimmed_display_name) not between 2 and 100 then
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

  perform 1
  from public.users
  where id = current_user_id
  for update;

  if not found then
    raise exception using
      errcode = 'L1004',
      message = 'The current user profile must exist before creating a space.';
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
