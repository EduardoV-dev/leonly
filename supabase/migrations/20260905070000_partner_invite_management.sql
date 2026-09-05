create table public.invite_regeneration_attempt_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz[] not null default '{}',
  updated_at timestamptz not null default timezone('utc', now()),

  constraint invite_regeneration_attempt_limits_requested_at_check
    check (cardinality(requested_at) <= 5)
);

alter table public.invite_regeneration_attempt_limits enable row level security;

revoke all on table public.invite_regeneration_attempt_limits from public;
revoke all on table public.invite_regeneration_attempt_limits from anon;
revoke all on table public.invite_regeneration_attempt_limits from authenticated;

create or replace function public.regenerate_space_invite()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  request_time timestamptz := pg_catalog.clock_timestamp();
  generated_invite_code text;
  matching_space public.spaces%rowtype;
  rate_limit public.invite_regeneration_attempt_limits%rowtype;
  recent_requests timestamptz[];
  retry_after integer;
  active_member_count integer;
begin
  if current_user_id is null then
    raise exception using errcode = 'L1001', message = 'Authentication is required.';
  end if;

  insert into public.invite_regeneration_attempt_limits (user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;

  select * into rate_limit
  from public.invite_regeneration_attempt_limits
  where user_id = current_user_id
  for update;

  select coalesce(
    pg_catalog.array_agg(requested_at order by requested_at),
    array[]::timestamptz[]
  )
  into recent_requests
  from pg_catalog.unnest(rate_limit.requested_at) as requests(requested_at)
  where requested_at > request_time - interval '10 minutes';

  if pg_catalog.cardinality(recent_requests) >= 5 then
    retry_after := pg_catalog.greatest(
      1,
      pg_catalog.ceil(
        extract(epoch from recent_requests[1] + interval '10 minutes' - request_time)
      )::integer
    );

    update public.invite_regeneration_attempt_limits
    set requested_at = recent_requests,
      updated_at = request_time
    where user_id = current_user_id;

    return pg_catalog.jsonb_build_object('status', 'locked', 'retry_after', retry_after);
  end if;

  update public.invite_regeneration_attempt_limits
  set requested_at = recent_requests || request_time,
    updated_at = request_time
  where user_id = current_user_id;

  select space.* into matching_space
  from public.space_members as member
  inner join public.spaces as space on space.id = member.space_id
  inner join public.users as profile on profile.id = member.user_id
  where member.user_id = current_user_id
    and member.deleted_at is null
    and space.deleted_at is null
    and profile.deleted_at is null
  for update of space;

  if matching_space.id is null then
    return pg_catalog.jsonb_build_object('status', 'unavailable');
  end if;

  select pg_catalog.count(*) into active_member_count
  from public.space_members as member
  inner join public.users as profile on profile.id = member.user_id
  where member.space_id = matching_space.id
    and member.deleted_at is null
    and profile.deleted_at is null;

  if active_member_count = 2 then
    return pg_catalog.jsonb_build_object('status', 'joined');
  end if;

  if active_member_count <> 1
    or (
      matching_space.invite_code is not null
      and matching_space.invite_code_expires_at > request_time
    ) then
    return pg_catalog.jsonb_build_object('status', 'unavailable');
  end if;

  for attempt in 1..10 loop
    generated_invite_code := public.generate_space_invite_code();

    begin
      update public.spaces
      set invite_code = generated_invite_code,
        updated_by_user_id = current_user_id
      where id = matching_space.id
      returning * into matching_space;

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

  return pg_catalog.jsonb_build_object(
    'status', 'regenerated',
    'invite_code', matching_space.invite_code,
    'invite_code_expires_at', matching_space.invite_code_expires_at
  );
end;
$$;

revoke execute on function public.regenerate_space_invite() from public;
revoke execute on function public.regenerate_space_invite() from anon;
grant execute on function public.regenerate_space_invite() to authenticated;
