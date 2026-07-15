alter table public.space_members
add column if not exists onboarding_completed_at timestamptz;

update public.space_members
set onboarding_completed_at = created_at
where is_active = true
  and onboarding_completed_at is null;

create or replace function public.create_space(
  p_space_name text,
  p_display_name text,
  p_start_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  invite_prefixes constant text[] := array['leo', 'lov', 'mem', 'our', 'duo', 'two', 'joy', 'sun', 'lny'];
  random_part text;
  trimmed_display_name text := btrim(p_display_name);
  trimmed_space_name text := btrim(p_space_name);
  current_user_id uuid := auth.uid();
  created_space record;
  generated_invite_code text;
  is_available boolean;
  max_attempts integer := 10;
  prefix text;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if char_length(trimmed_space_name) < 2 then
    raise exception 'Space name must be at least 2 characters.';
  end if;

  if char_length(trimmed_space_name) > 100 then
    raise exception 'Space name must be 100 characters or fewer.';
  end if;

  if char_length(trimmed_display_name) < 2 then
    raise exception 'Your name must be at least 2 characters.';
  end if;

  if char_length(trimmed_display_name) > 100 then
    raise exception 'Your name must be 100 characters or fewer.';
  end if;

  if p_start_date is null then
    raise exception 'Start date is required.';
  end if;

  if p_start_date > current_date then
    raise exception 'The start date cannot be in the future.';
  end if;

  if not exists(select 1 from public.users where id = current_user_id) then
    raise exception 'The current user profile must exist before creating a space.';
  end if;

  if exists(
    select 1
    from public.space_members space_member
    inner join public.spaces space on space.id = space_member.space_id
    where space_member.user_id = current_user_id
      and space_member.is_active = true
      and space.is_active = true
  ) then
    raise exception 'You already belong to an active space.';
  end if;

  for attempt in 1..max_attempts loop
    prefix := invite_prefixes[1 + floor(random() * array_length(invite_prefixes, 1))::integer];
    random_part := '';

    for character_index in 1..5 loop
      random_part := random_part || substr(
        invite_alphabet,
        1 + floor(random() * length(invite_alphabet))::integer,
        1
      );
    end loop;

    generated_invite_code := lower(prefix || random_part);

    select not exists(
      select 1
      from public.spaces space
      where space.invite_code = generated_invite_code
        and space.is_active = true
    ) into is_available;

    exit when is_available;
  end loop;

  if not coalesce(is_available, false) then
    raise exception 'We could not generate a unique invite code. Please try again.';
  end if;

  insert into public.spaces (
    created_by_user_id,
    invite_code,
    invite_code_expires_at,
    is_active,
    name,
    start_date,
    updated_by_user_id
  )
  values (
    current_user_id,
    generated_invite_code,
    null,
    true,
    trimmed_space_name,
    p_start_date,
    current_user_id
  )
  returning * into created_space;

  insert into public.space_members (
    display_name,
    is_active,
    role,
    space_id,
    user_id
  )
  values (
    trimmed_display_name,
    true,
    'owner',
    created_space.id,
    current_user_id
  );

  return jsonb_build_object(
    'id', created_space.id,
    'invite_code', created_space.invite_code,
    'name', created_space.name,
    'start_date', created_space.start_date
  );
end;
$$;

create or replace function public.get_active_space()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', space.id,
    'invite_code', space.invite_code,
    'invite_code_expires_at', space.invite_code_expires_at,
    'name', space.name,
    'onboarding_completed_at', space_member.onboarding_completed_at,
    'start_date', space.start_date
  )
  from public.space_members space_member
  inner join public.spaces space on space.id = space_member.space_id
  where space_member.user_id = auth.uid()
    and space_member.is_active = true
    and space.is_active = true
  limit 1;
$$;

create or replace function public.join_space(
  p_invite_code text,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  matching_space record;
  trimmed_display_name text := btrim(p_display_name);
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if exists(
    select 1
    from public.space_members space_member
    inner join public.spaces space on space.id = space_member.space_id
    where space_member.user_id = current_user_id
      and space_member.is_active = true
      and space.is_active = true
  ) then
    raise exception 'You already belong to an active space.';
  end if;

  select space.* into matching_space
  from public.spaces space
  where space.invite_code = lower(p_invite_code)
    and space.is_active = true
    and (space.invite_code_expires_at is null or space.invite_code_expires_at > now())
  for update;

  if matching_space.id is null
    or not exists(
      select 1
      from public.space_members space_member
      where space_member.space_id = matching_space.id
        and space_member.role = 'owner'
        and space_member.is_active = true
    )
    or exists(
      select 1
      from public.space_members space_member
      where space_member.space_id = matching_space.id
        and space_member.role = 'partner'
        and space_member.is_active = true
    ) then
    raise exception 'No space found for this invite code.';
  end if;

  if trimmed_display_name = '' then
    select name into trimmed_display_name
    from public.users
    where id = current_user_id;
  end if;

  if trimmed_display_name is null then
    raise exception 'The current user profile must exist before joining a space.';
  end if;

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
    timezone('utc', now()),
    'partner',
    matching_space.id,
    current_user_id
  );

  return jsonb_build_object('id', matching_space.id);
end;
$$;

create or replace function public.complete_space_setup()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  update public.space_members space_member
  set onboarding_completed_at = coalesce(space_member.onboarding_completed_at, timezone('utc', now()))
  from public.spaces space
  where space_member.space_id = space.id
    and space_member.user_id = current_user_id
    and space_member.is_active = true
    and space.is_active = true;

  if not found then
    raise exception 'You do not belong to an active space.';
  end if;
end;
$$;

revoke execute on function public.complete_space_setup() from public;
revoke execute on function public.complete_space_setup() from anon;
grant execute on function public.complete_space_setup() to authenticated;
