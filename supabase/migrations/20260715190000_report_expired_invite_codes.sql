create or replace function public.find_joinable_space(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  matching_space record;
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
    and space.is_active = true;

  if matching_space.id is null then
    raise exception 'No space found for this invite code.';
  end if;

  if matching_space.invite_code_expires_at is not null
    and matching_space.invite_code_expires_at <= now() then
    raise exception 'This invite code has expired.';
  end if;

  if not exists(
    select 1
    from public.space_members space_member
    where space_member.space_id = matching_space.id
      and space_member.role = 'owner'
      and space_member.is_active = true
  ) or exists(
    select 1
    from public.space_members space_member
    where space_member.space_id = matching_space.id
      and space_member.role = 'partner'
      and space_member.is_active = true
  ) then
    raise exception 'No space found for this invite code.';
  end if;

  return jsonb_build_object('id', matching_space.id);
end;
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
  for update;

  if matching_space.id is null then
    raise exception 'No space found for this invite code.';
  end if;

  if matching_space.invite_code_expires_at is not null
    and matching_space.invite_code_expires_at <= now() then
    raise exception 'This invite code has expired.';
  end if;

  if not exists(
    select 1
    from public.space_members space_member
    where space_member.space_id = matching_space.id
      and space_member.role = 'owner'
      and space_member.is_active = true
  ) or exists(
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
