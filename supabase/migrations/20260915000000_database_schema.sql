create extension if not exists pgcrypto;

create schema if not exists private;

create type public.space_member_role as enum ('owner', 'partner');
create type public.memory_visibility as enum ('timeline', 'vault');
create type public.memory_attempt_type as enum ('create', 'edit');
create type public.memory_attempt_status as enum (
  'preparing', 'processing', 'completed', 'failed', 'conflict', 'expired'
);
create type public.memory_asset_type as enum ('image');
create type public.memory_asset_variant_type as enum ('original', 'cover', 'detail');
create type public.memory_asset_object_status as enum (
  'pending', 'uploaded', 'processing', 'ready', 'failed'
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_subject text not null unique,
  name text not null,
  email text not null,
  avatar_url text,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint users_auth_subject_not_blank check (char_length(btrim(auth_subject)) > 0),
  constraint users_name_length check (char_length(btrim(name)) between 1 and 100),
  constraint users_email_not_blank check (char_length(btrim(email)) > 0)
);

create unique index users_email_unique on public.users (lower(email));

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  invite_code text,
  invite_code_expires_at timestamptz,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  updated_by_user_id uuid not null references public.users(id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint spaces_name_length check (char_length(btrim(name)) between 2 and 100),
  constraint spaces_invite_expiry_pair check (
    (invite_code is null) = (invite_code_expires_at is null)
  ),
  constraint spaces_invite_code_format check (
    invite_code is null
    or invite_code ~ '^(leo|lov|mem|our|duo|two|joy|sun|lny)[abcdefghjkmnpqrstuvwxyz23456789]{5}$'
  )
);

create unique index spaces_active_invite_code_unique on public.spaces (invite_code)
where deleted_at is null and invite_code is not null;
create index spaces_created_by_user_id on public.spaces (created_by_user_id);
create index spaces_updated_by_user_id on public.spaces (updated_by_user_id);

create table public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  display_name text not null,
  role public.space_member_role not null,
  onboarding_completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint space_members_display_name_length
    check (char_length(btrim(display_name)) between 2 and 100),
  constraint space_members_id_user_space_unique unique (id, user_id, space_id),
  constraint space_members_id_space_unique unique (id, space_id)
);

create unique index space_members_active_user_unique on public.space_members (user_id)
where deleted_at is null;
create unique index space_members_active_space_user_unique
on public.space_members (space_id, user_id) where deleted_at is null;
create unique index space_members_active_space_role_unique
on public.space_members (space_id, role) where deleted_at is null;
create index space_members_space_id on public.space_members (space_id);

create table public.rate_limits (
  scope text not null,
  subject_key text not null,
  attempts timestamptz[] not null default '{}',
  blocked_until timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (scope, subject_key),
  constraint rate_limits_scope_not_blank check (char_length(btrim(scope)) > 0),
  constraint rate_limits_subject_not_blank check (char_length(btrim(subject_key)) > 0),
  constraint rate_limits_attempts_bounded check (cardinality(attempts) <= 100)
);

create index rate_limits_expires_at on public.rate_limits (expires_at);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete restrict,
  creator_membership_id uuid not null,
  creator_user_id uuid not null,
  cover_asset_id uuid,
  title text not null,
  description text,
  location text,
  memory_date date not null,
  visibility public.memory_visibility not null,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint memories_id_space_unique unique (id, space_id),
  constraint memories_creator_membership_fkey
    foreign key (creator_membership_id, creator_user_id, space_id)
    references public.space_members (id, user_id, space_id) on delete restrict,
  constraint memories_title_length check (char_length(btrim(title)) between 1 and 120),
  constraint memories_description_length
    check (description is null or char_length(btrim(description)) <= 2000),
  constraint memories_location_length
    check (location is null or char_length(btrim(location)) <= 150)
);

create index memories_creator_membership_id on public.memories (creator_membership_id);
create index memories_creator_user_id on public.memories (creator_user_id);
create index memories_timeline_page
on public.memories (space_id, memory_date desc, created_at desc, id desc)
where visibility = 'timeline' and deleted_at is null;
create index memories_vault_page
on public.memories (space_id, memory_date desc, created_at desc, id desc)
where visibility = 'vault' and deleted_at is null;

create table public.memory_attempts (
  id uuid primary key default gen_random_uuid(),
  attempt_type public.memory_attempt_type not null,
  status public.memory_attempt_status not null default 'preparing',
  actor_membership_id uuid not null,
  actor_user_id uuid not null,
  space_id uuid not null references public.spaces(id) on delete restrict,
  memory_id uuid,
  expected_updated_at timestamptz,
  title text not null,
  description text,
  location text,
  memory_date date not null,
  visibility public.memory_visibility not null,
  failure_code text,
  expires_at timestamptz not null default timezone('utc', now()) + interval '1 day',
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint memory_attempts_id_space_unique unique (id, space_id),
  constraint memory_attempts_actor_fkey
    foreign key (actor_membership_id, actor_user_id, space_id)
    references public.space_members (id, user_id, space_id) on delete restrict,
  constraint memory_attempts_memory_fkey foreign key (memory_id, space_id)
    references public.memories (id, space_id) on delete restrict,
  constraint memory_attempts_type_fields check (
    (attempt_type = 'create' and expected_updated_at is null)
    or (attempt_type = 'edit' and memory_id is not null and expected_updated_at is not null)
  ),
  constraint memory_attempts_completion_fields check (
    (status = 'completed' and memory_id is not null and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  ),
  constraint memory_attempts_title_length check (char_length(btrim(title)) between 1 and 120),
  constraint memory_attempts_description_length
    check (description is null or char_length(btrim(description)) <= 2000),
  constraint memory_attempts_location_length
    check (location is null or char_length(btrim(location)) <= 150),
  constraint memory_attempts_failure_code_length
    check (failure_code is null or char_length(btrim(failure_code)) between 1 and 100)
);

create index memory_attempts_actor_membership_id on public.memory_attempts (actor_membership_id);
create index memory_attempts_memory_id on public.memory_attempts (memory_id);
create index memory_attempts_state_expiry on public.memory_attempts (status, expires_at);

create table public.memory_assets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete restrict,
  memory_id uuid,
  staging_attempt_id uuid,
  asset_type public.memory_asset_type not null default 'image',
  position smallint,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint memory_assets_memory_fkey foreign key (memory_id, space_id)
    references public.memories (id, space_id) on delete cascade,
  constraint memory_assets_attempt_fkey foreign key (staging_attempt_id, space_id)
    references public.memory_attempts (id, space_id) on delete cascade,
  constraint memory_assets_owner_xor check (
    (memory_id is null) <> (staging_attempt_id is null)
  ),
  constraint memory_assets_position_state check (
    (memory_id is not null and position >= 0)
    or (staging_attempt_id is not null and position is null)
  ),
  constraint memory_assets_memory_position_unique unique (memory_id, position),
  constraint memory_assets_id_memory_unique unique (id, memory_id),
  constraint memory_assets_id_space_unique unique (id, space_id)
);

create index memory_assets_space_id on public.memory_assets (space_id);
create index memory_assets_staging_attempt_id on public.memory_assets (staging_attempt_id);

create table public.memory_asset_objects (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.memory_assets(id) on delete cascade,
  variant_type public.memory_asset_variant_type not null,
  object_path text not null unique,
  status public.memory_asset_object_status not null default 'pending',
  content_type text,
  byte_size bigint,
  failure_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  ready_at timestamptz,
  constraint memory_asset_objects_asset_variant_unique unique (asset_id, variant_type),
  constraint memory_asset_objects_path_not_blank check (char_length(btrim(object_path)) > 0),
  constraint memory_asset_objects_byte_size check (byte_size is null or byte_size >= 0),
  constraint memory_asset_objects_ready_at check ((status = 'ready') = (ready_at is not null)),
  constraint memory_asset_objects_failure_code_length
    check (failure_code is null or char_length(btrim(failure_code)) between 1 and 100)
);

create index memory_asset_objects_status on public.memory_asset_objects (status);
create index memory_asset_objects_ready on public.memory_asset_objects (asset_id, variant_type)
where status = 'ready';

create table public.memory_attempt_assets (
  attempt_id uuid not null,
  asset_id uuid not null,
  space_id uuid not null references public.spaces(id) on delete restrict,
  position smallint not null check (position >= 0),
  is_cover boolean not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (attempt_id, asset_id),
  constraint memory_attempt_assets_attempt_fkey foreign key (attempt_id, space_id)
    references public.memory_attempts (id, space_id) on delete cascade,
  constraint memory_attempt_assets_asset_fkey foreign key (asset_id, space_id)
    references public.memory_assets (id, space_id) on delete restrict,
  constraint memory_attempt_assets_position_unique unique (attempt_id, position)
);

create unique index memory_attempt_assets_one_cover
on public.memory_attempt_assets (attempt_id) where is_cover;
create index memory_attempt_assets_asset_id on public.memory_attempt_assets (asset_id);

alter table public.memories
  add constraint memories_cover_asset_same_memory_fkey
  foreign key (cover_asset_id, id) references public.memory_assets (id, memory_id) on delete restrict;

create index memories_cover_asset_id on public.memories (cover_asset_id)
where cover_asset_id is not null;

create table public.memory_comments (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null,
  space_id uuid not null references public.spaces(id) on delete restrict,
  author_membership_id uuid not null,
  author_user_id uuid not null,
  body text not null,
  version integer not null default 1,
  idempotency_key uuid not null,
  request_fingerprint text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint memory_comments_memory_fkey foreign key (memory_id, space_id)
    references public.memories (id, space_id) on delete restrict,
  constraint memory_comments_author_fkey
    foreign key (author_membership_id, author_user_id, space_id)
    references public.space_members (id, user_id, space_id) on delete restrict,
  constraint memory_comments_body_length check (char_length(btrim(body)) between 1 and 1000),
  constraint memory_comments_version_positive check (version > 0),
  constraint memory_comments_fingerprint_format check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint memory_comments_author_key_unique unique (author_user_id, idempotency_key)
);

create index memory_comments_active_page
on public.memory_comments (memory_id, created_at desc, id desc) where deleted_at is null;
create index memory_comments_space_id on public.memory_comments (space_id);
create index memory_comments_author_membership_id on public.memory_comments (author_membership_id);

create table public.memory_reactions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null,
  space_id uuid not null references public.spaces(id) on delete cascade,
  memory_id uuid not null,
  reaction_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint memory_reactions_membership_fkey foreign key (membership_id, space_id)
    references public.space_members (id, space_id) on delete cascade,
  constraint memory_reactions_memory_fkey foreign key (memory_id, space_id)
    references public.memories (id, space_id) on delete cascade,
  constraint memory_reactions_type check (reaction_type in ('heart', 'laugh', 'cry', 'star')),
  constraint memory_reactions_membership_memory_unique unique (membership_id, memory_id)
);

create index memory_reactions_memory_id on public.memory_reactions (memory_id);

create table public.resource_cleanup (
  id bigint generated always as identity primary key,
  resource_kind text not null,
  resource_locator text not null,
  cleanup_after timestamptz not null default timezone('utc', now()),
  retry_after timestamptz,
  locked_until timestamptz,
  attempt_count integer not null default 0,
  last_attempted_at timestamptz,
  last_failure_code text,
  cleaned_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint resource_cleanup_resource_unique unique (resource_kind, resource_locator),
  constraint resource_cleanup_kind_not_blank check (char_length(btrim(resource_kind)) > 0),
  constraint resource_cleanup_locator_not_blank check (char_length(btrim(resource_locator)) > 0),
  constraint resource_cleanup_attempt_count check (attempt_count >= 0),
  constraint resource_cleanup_failure_code_length
    check (last_failure_code is null or char_length(btrim(last_failure_code)) between 1 and 100)
);

create index resource_cleanup_pending_claim
on public.resource_cleanup (cleanup_after, retry_after, locked_until, id)
where cleaned_at is null;

create function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := pg_catalog.timezone('utc', pg_catalog.now());
  return new;
end;
$$;

create function private.validate_memory_attempt_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status in ('completed', 'failed', 'conflict', 'expired') and new.status <> old.status then
    raise exception 'terminal memory attempts cannot transition';
  end if;
  if old.status = 'preparing' and new.status not in ('preparing', 'processing', 'failed', 'expired') then
    raise exception 'invalid memory attempt transition';
  end if;
  if old.status = 'processing'
    and new.status not in ('processing', 'completed', 'failed', 'conflict', 'expired') then
    raise exception 'invalid memory attempt transition';
  end if;
  return new;
end;
$$;

create trigger users_updated_at before update on public.users
for each row execute function private.set_updated_at();
create trigger spaces_updated_at before update on public.spaces
for each row execute function private.set_updated_at();
create trigger space_members_updated_at before update on public.space_members
for each row execute function private.set_updated_at();
create trigger rate_limits_updated_at before update on public.rate_limits
for each row execute function private.set_updated_at();
create trigger memories_updated_at before update on public.memories
for each row execute function private.set_updated_at();
create trigger memory_comments_updated_at before update on public.memory_comments
for each row execute function private.set_updated_at();
create trigger memory_attempts_transition before update on public.memory_attempts
for each row execute function private.validate_memory_attempt_transition();
create trigger memory_attempts_updated_at before update on public.memory_attempts
for each row execute function private.set_updated_at();
create trigger memory_assets_updated_at before update on public.memory_assets
for each row execute function private.set_updated_at();
create trigger memory_asset_objects_updated_at before update on public.memory_asset_objects
for each row execute function private.set_updated_at();
create trigger memory_reactions_updated_at before update on public.memory_reactions
for each row execute function private.set_updated_at();
create trigger resource_cleanup_updated_at before update on public.resource_cleanup
for each row execute function private.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memory-photos',
  'memory-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function private.current_user_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select profile.id
  from public.users as profile
  where profile.auth_subject = (select auth.uid())::text
    and profile.deleted_at is null;
$$;

create function private.active_membership()
returns public.space_members language sql stable security definer set search_path = '' as $$
  select member
  from public.space_members as member
  inner join public.spaces as space on space.id = member.space_id
  where member.user_id = private.current_user_id()
    and member.deleted_at is null
    and space.deleted_at is null
  limit 1;
$$;

create function private.is_active_space_member(p_space_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.space_members as member
    inner join public.spaces as space on space.id = member.space_id
    where member.space_id = p_space_id
      and member.user_id = private.current_user_id()
      and member.deleted_at is null
      and space.deleted_at is null
  );
$$;

create function private.can_view_profile(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.space_members as current_member
    inner join public.space_members as visible_member
      on visible_member.space_id = current_member.space_id
    where current_member.user_id = private.current_user_id()
      and current_member.deleted_at is null
      and visible_member.user_id = p_user_id
      and visible_member.deleted_at is null
  );
$$;

create function private.can_access_memory_asset_object(p_object_path text, p_writing boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memory_asset_objects as object
    inner join public.memory_assets as asset on asset.id = object.asset_id
    left join public.memory_attempts as attempt on attempt.id = asset.staging_attempt_id
    left join public.memories as memory on memory.id = asset.memory_id
    where object.object_path = p_object_path
      and private.is_active_space_member(asset.space_id)
      and (
        (not p_writing and memory.id is not null and memory.deleted_at is null and object.status = 'ready')
        or (
          p_writing
          and attempt.id is not null
          and attempt.actor_user_id = private.current_user_id()
          and attempt.status in ('preparing', 'processing')
          and attempt.expires_at > pg_catalog.clock_timestamp()
          and object.variant_type = 'original'
          and object.status in ('pending', 'uploaded')
        )
      )
  );
$$;

create function private.consume_rate_limit(
  p_scope text,
  p_subject_key text,
  p_limit integer,
  p_window interval
)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  request_time timestamptz := pg_catalog.clock_timestamp();
  current_limit public.rate_limits;
  recent_attempts timestamptz[];
begin
  insert into public.rate_limits (scope, subject_key, expires_at)
  values (p_scope, p_subject_key, request_time + p_window)
  on conflict (scope, subject_key) do nothing;

  select * into current_limit from public.rate_limits
  where scope = p_scope and subject_key = p_subject_key for update;

  select coalesce(array_agg(attempt_at order by attempt_at), array[]::timestamptz[])
  into recent_attempts
  from unnest(current_limit.attempts) as entries(attempt_at)
  where attempt_at > request_time - p_window;

  if cardinality(recent_attempts) >= p_limit then
    return greatest(1, ceil(extract(epoch from recent_attempts[1] + p_window - request_time))::int);
  end if;

  update public.rate_limits set
    attempts = recent_attempts || request_time,
    expires_at = request_time + p_window
  where scope = p_scope and subject_key = p_subject_key;
  return 0;
end;
$$;

create function private.generate_space_invite_code()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  prefixes constant text[] := array['leo', 'lov', 'mem', 'our', 'duo', 'two', 'joy', 'sun', 'lny'];
  bytes bytea := pg_catalog.uuid_send(pg_catalog.gen_random_uuid());
  result text := prefixes[1 + pg_catalog.get_byte(bytes, 0) % cardinality(prefixes)];
begin
  for byte_index in 1..5 loop
    result := result || substr(alphabet, 1 + pg_catalog.get_byte(bytes, byte_index) % length(alphabet), 1);
  end loop;
  return result;
end;
$$;

create function public.sync_current_user(
  p_name text,
  p_email text,
  p_avatar_url text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  subject text := (select auth.uid())::text;
  normalized_name text := btrim(p_name);
  normalized_email text := btrim(p_email);
begin
  if subject is null then raise exception 'Authentication is required.'; end if;
  if char_length(normalized_name) not between 1 and 100
    or char_length(normalized_email) = 0 then
    raise exception 'Invalid profile details.';
  end if;

  insert into public.users (auth_subject, name, email, avatar_url, deleted_at)
  values (subject, normalized_name, normalized_email, p_avatar_url, null)
  on conflict (auth_subject) do update
  set name = excluded.name,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    deleted_at = null;
end;
$$;

create function public.create_space(
  p_space_name text,
  p_display_name text,
  p_start_date date,
  p_timezone text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_id uuid := private.current_user_id();
  created_space public.spaces;
  display_name text := nullif(btrim(p_display_name), '');
  generated_code text;
begin
  if current_id is null then raise exception 'Authentication is required.'; end if;
  if char_length(btrim(p_space_name)) not between 2 and 100
    or p_start_date is null
    or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
    or p_start_date > (pg_catalog.clock_timestamp() at time zone p_timezone)::date then
    raise exception 'Invalid space details.';
  end if;
  if exists (select 1 from public.space_members where user_id = current_id and deleted_at is null) then
    raise exception 'You already belong to an active space.';
  end if;
  if display_name is null then
    select btrim(name) into display_name from public.users where id = current_id for update;
  end if;
  if char_length(display_name) not between 2 and 100 then display_name := 'Leonly User'; end if;

  for invite_attempt in 1..10 loop
    generated_code := private.generate_space_invite_code();
    begin
      insert into public.spaces (
        name, start_date, invite_code, invite_code_expires_at,
        created_by_user_id, updated_by_user_id
      ) values (
        btrim(p_space_name), p_start_date, generated_code,
        pg_catalog.clock_timestamp() + interval '24 hours', current_id, current_id
      ) returning * into created_space;
      exit;
    exception when unique_violation then
      if invite_attempt = 10 then raise exception 'Could not generate an invite code.'; end if;
    end;
  end loop;

  insert into public.space_members (
    space_id, user_id, display_name, role, onboarding_completed_at
  ) values (created_space.id, current_id, display_name, 'owner', pg_catalog.clock_timestamp());
  return jsonb_build_object('id', created_space.id, 'invite_code', created_space.invite_code);
end;
$$;

create function public.get_active_space()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', space.id,
    'invite_code', space.invite_code,
    'invite_code_expires_at', space.invite_code_expires_at,
    'active_members', members.rows,
    'member_names', members.names,
    'name', space.name,
    'onboarding_completed_at', current_member.onboarding_completed_at,
    'start_date', space.start_date
  )
  from public.space_members as current_member
  inner join public.spaces as space on space.id = current_member.space_id
  cross join lateral (
    select
      coalesce(jsonb_agg(jsonb_build_object(
        'avatar_url', profile.avatar_url, 'display_name', member.display_name
      ) order by member.role), '[]'::jsonb) as rows,
      jsonb_agg(member.display_name order by member.role) as names
    from public.space_members as member
    inner join public.users as profile on profile.id = member.user_id
    where member.space_id = space.id and member.deleted_at is null and profile.deleted_at is null
  ) as members
  where current_member.user_id = private.current_user_id()
    and current_member.deleted_at is null and space.deleted_at is null
  limit 1;
$$;

create function public.process_space_invite(
  p_invite_code text,
  p_display_name text default null,
  p_redeem boolean default false
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_id uuid := private.current_user_id();
  normalized_code text := replace(lower(btrim(coalesce(p_invite_code, ''))), '-', '');
  matching_space public.spaces;
  display_name text := nullif(btrim(p_display_name), '');
  retry_after integer;
begin
  if current_id is null then return jsonb_build_object('status', 'unavailable'); end if;
  retry_after := private.consume_rate_limit('space_join', (select auth.uid())::text, 5, interval '10 minutes');
  if retry_after > 0 then return jsonb_build_object('status', 'locked', 'retry_after', retry_after); end if;
  if normalized_code !~ '^(leo|lov|mem|our|duo|two|joy|sun|lny)[abcdefghjkmnpqrstuvwxyz23456789]{5}$' then
    return jsonb_build_object('status', 'malformed');
  end if;
  if exists (select 1 from public.space_members where user_id = current_id and deleted_at is null) then
    return jsonb_build_object('status', 'unavailable');
  end if;
  select * into matching_space from public.spaces
  where invite_code = normalized_code and invite_code_expires_at > pg_catalog.clock_timestamp()
    and deleted_at is null for update;
  if not found or (select count(*) from public.space_members
      where space_id = matching_space.id and deleted_at is null) <> 1 then
    return jsonb_build_object('status', 'unavailable');
  end if;
  if not p_redeem then return jsonb_build_object('status', 'valid'); end if;
  if display_name is null then select btrim(name) into display_name from public.users where id = current_id; end if;
  if char_length(display_name) not between 2 and 100 then return jsonb_build_object('status', 'invalid_name'); end if;
  insert into public.space_members (space_id, user_id, display_name, role, onboarding_completed_at)
  values (matching_space.id, current_id, display_name, 'partner', pg_catalog.clock_timestamp());
  update public.spaces set invite_code = null, invite_code_expires_at = null,
    updated_by_user_id = current_id where id = matching_space.id;
  return jsonb_build_object('status', 'joined', 'space_id', matching_space.id);
end;
$$;

create function public.regenerate_space_invite()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_id uuid := private.current_user_id();
  membership public.space_members := private.active_membership();
  matching_space public.spaces;
  generated_code text;
  retry_after integer;
begin
  if membership.id is null then return jsonb_build_object('status', 'unavailable'); end if;
  retry_after := private.consume_rate_limit(
    'invite_regeneration', (select auth.uid())::text, 5, interval '10 minutes'
  );
  if retry_after > 0 then return jsonb_build_object('status', 'locked', 'retry_after', retry_after); end if;
  select * into matching_space from public.spaces where id = membership.space_id for update;
  if (select count(*) from public.space_members where space_id = matching_space.id and deleted_at is null) = 2 then
    return jsonb_build_object('status', 'joined');
  end if;
  if matching_space.invite_code_expires_at > pg_catalog.clock_timestamp() then
    return jsonb_build_object('status', 'unavailable');
  end if;
  for invite_attempt in 1..10 loop
    generated_code := private.generate_space_invite_code();
    begin
      update public.spaces set invite_code = generated_code,
        invite_code_expires_at = pg_catalog.clock_timestamp() + interval '24 hours',
        updated_by_user_id = current_id where id = matching_space.id returning * into matching_space;
      exit;
    exception when unique_violation then
      if invite_attempt = 10 then raise exception 'Could not generate an invite code.'; end if;
    end;
  end loop;
  return jsonb_build_object('status', 'regenerated', 'invite_code', matching_space.invite_code,
    'invite_code_expires_at', matching_space.invite_code_expires_at);
end;
$$;

create function public.complete_space_setup()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.space_members set onboarding_completed_at = coalesce(
    onboarding_completed_at, pg_catalog.clock_timestamp()
  ) where user_id = private.current_user_id() and deleted_at is null;
  if not found then raise exception 'You do not belong to an active space.'; end if;
end;
$$;

create function public.get_active_space_settings()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', space.id, 'name', space.name, 'updated_at', space.updated_at,
    'start_date', space.start_date,
    'invite_code', case when members.member_count = 1 then space.invite_code end,
    'invite_code_expires_at', case when members.member_count = 1 then space.invite_code_expires_at end,
    'invite_code_is_available', members.member_count = 1 and space.invite_code is not null
      and space.invite_code_expires_at > pg_catalog.clock_timestamp(),
    'active_members', members.rows
  )
  from public.space_members as current_member
  inner join public.spaces as space on space.id = current_member.space_id
  cross join lateral (
    select count(*) as member_count, jsonb_agg(jsonb_build_object(
      'membership_id', member.id, 'display_name', member.display_name,
      'avatar_url', profile.avatar_url, 'created_at', member.created_at,
      'updated_at', member.updated_at, 'role', member.role,
      'is_current_member', member.id = current_member.id
    ) order by member.role) as rows
    from public.space_members as member
    inner join public.users as profile on profile.id = member.user_id
    where member.space_id = space.id and member.deleted_at is null and profile.deleted_at is null
  ) as members
  where current_member.user_id = private.current_user_id()
    and current_member.deleted_at is null and space.deleted_at is null
  limit 1;
$$;

create function public.rename_active_space(p_name text, p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  membership public.space_members := private.active_membership();
  matching_space public.spaces;
  normalized_name text := btrim(p_name);
begin
  if char_length(normalized_name) not between 2 and 100 or p_expected_updated_at is null then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into matching_space from public.spaces where id = membership.space_id for update;
  if not found then return jsonb_build_object('status', 'unavailable'); end if;
  if matching_space.updated_at <> p_expected_updated_at then
    return jsonb_build_object('status', 'conflict', 'name', matching_space.name,
      'updated_at', matching_space.updated_at);
  end if;
  update public.spaces set name = normalized_name, updated_by_user_id = private.current_user_id()
  where id = matching_space.id returning * into matching_space;
  return jsonb_build_object('status', 'updated', 'name', matching_space.name,
    'updated_at', matching_space.updated_at);
end;
$$;

create function public.update_active_space_start_date(
  p_start_date text,
  p_timezone text,
  p_expected_updated_at timestamptz
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  membership public.space_members := private.active_membership();
  matching_space public.spaces;
  parsed_date date;
begin
  begin parsed_date := p_start_date::date; exception when others then
    return jsonb_build_object('status', 'invalid');
  end;
  if to_char(parsed_date, 'YYYY-MM-DD') <> p_start_date or p_expected_updated_at is null
    or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
    or parsed_date > (pg_catalog.clock_timestamp() at time zone p_timezone)::date then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into matching_space from public.spaces where id = membership.space_id for update;
  if not found then return jsonb_build_object('status', 'unavailable'); end if;
  if matching_space.updated_at <> p_expected_updated_at then
    return jsonb_build_object('status', 'conflict', 'start_date', matching_space.start_date,
      'updated_at', matching_space.updated_at);
  end if;
  update public.spaces set start_date = parsed_date, updated_by_user_id = private.current_user_id()
  where id = matching_space.id returning * into matching_space;
  return jsonb_build_object('status', 'updated', 'start_date', matching_space.start_date,
    'updated_at', matching_space.updated_at);
end;
$$;

create function public.update_active_membership_display_name(
  p_display_name text,
  p_expected_updated_at timestamptz
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  membership public.space_members := private.active_membership();
  normalized_name text := btrim(p_display_name);
begin
  if char_length(normalized_name) not between 2 and 100 or p_expected_updated_at is null then
    return jsonb_build_object('status', 'invalid');
  end if;
  if membership.id is null then return jsonb_build_object('status', 'unavailable'); end if;
  if membership.updated_at <> p_expected_updated_at then
    return jsonb_build_object('status', 'conflict', 'display_name', membership.display_name,
      'updated_at', membership.updated_at);
  end if;
  update public.space_members set display_name = normalized_name where id = membership.id
  returning * into membership;
  return jsonb_build_object('status', 'updated', 'display_name', membership.display_name,
    'updated_at', membership.updated_at);
end;
$$;

create function public.get_memory_attempt_uploads(p_attempt_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'asset_id', asset.id, 'object_path', object.object_path
  ) order by selection.position), '[]'::jsonb)
  from public.memory_attempts as attempt
  inner join public.memory_attempt_assets as selection on selection.attempt_id = attempt.id
  inner join public.memory_assets as asset on asset.id = selection.asset_id
  inner join public.memory_asset_objects as object on object.asset_id = asset.id
    and object.variant_type = 'original'
  where attempt.id = p_attempt_id and attempt.actor_user_id = private.current_user_id()
    and attempt.status = 'processing' and asset.staging_attempt_id = attempt.id;
$$;

create function public.prepare_memory_attempt(
  p_attempt_type public.memory_attempt_type,
  p_memory_id uuid,
  p_expected_updated_at timestamptz,
  p_title text,
  p_description text,
  p_location text,
  p_memory_date date,
  p_timezone text,
  p_visibility public.memory_visibility,
  p_assets jsonb default '[]'::jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  membership public.space_members := private.active_membership();
  attempt public.memory_attempts;
  selection jsonb;
  asset_id uuid;
  is_new boolean;
  base_path text;
begin
  if membership.id is null then return jsonb_build_object('status', 'unavailable'); end if;
  if p_attempt_type = 'edit' and not exists (
    select 1 from public.memories where id = p_memory_id and space_id = membership.space_id
      and deleted_at is null and updated_at = p_expected_updated_at
  ) then return jsonb_build_object('status', 'conflict'); end if;
  if char_length(btrim(p_title)) not between 1 and 120
    or char_length(btrim(coalesce(p_description, ''))) > 2000
    or char_length(btrim(coalesce(p_location, ''))) > 150
    or p_memory_date is null or p_visibility is null
    or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
    or p_memory_date > (pg_catalog.clock_timestamp() at time zone p_timezone)::date
    or jsonb_typeof(p_assets) <> 'array' or jsonb_array_length(p_assets) > 10 then
    return jsonb_build_object('status', 'invalid');
  end if;

  insert into public.memory_attempts (
    attempt_type, actor_membership_id, actor_user_id, space_id, memory_id,
    expected_updated_at, title, description, location, memory_date, visibility
  ) values (
    p_attempt_type, membership.id, membership.user_id, membership.space_id,
    case when p_attempt_type = 'edit' then p_memory_id end,
    case when p_attempt_type = 'edit' then p_expected_updated_at end,
    btrim(p_title), nullif(btrim(p_description), ''), nullif(btrim(p_location), ''),
    p_memory_date, p_visibility
  ) returning * into attempt;

  for selection in select value from jsonb_array_elements(p_assets) loop
    begin
      asset_id := (selection->>'asset_id')::uuid;
      is_new := coalesce((selection->>'is_new')::boolean, false);
      if (selection->>'position')::integer < 0 then raise exception 'invalid position'; end if;
    exception when others then
      raise exception 'invalid asset selection';
    end;
    if is_new then
      insert into public.memory_assets (id, space_id, staging_attempt_id)
      values (asset_id, membership.space_id, attempt.id);
      base_path := membership.space_id::text || '/' || attempt.id::text || '/' || asset_id::text;
      insert into public.memory_asset_objects (asset_id, variant_type, object_path)
      values (asset_id, 'original', base_path || '/original'),
        (asset_id, 'cover', base_path || '/cover.webp'),
        (asset_id, 'detail', base_path || '/detail.webp');
    elsif p_attempt_type <> 'edit' or not exists (
      select 1 from public.memory_assets where id = asset_id and memory_id = p_memory_id
        and space_id = membership.space_id
    ) then
      raise exception 'invalid retained asset';
    end if;
    insert into public.memory_attempt_assets (attempt_id, asset_id, space_id, position, is_cover)
    values (attempt.id, asset_id, membership.space_id, (selection->>'position')::smallint,
      coalesce((selection->>'is_cover')::boolean, false));
  end loop;
  update public.memory_attempts set status = 'processing' where id = attempt.id;
  return jsonb_build_object('status', 'prepared', 'attempt_id', attempt.id,
    'uploads', public.get_memory_attempt_uploads(attempt.id));
exception when unique_violation or check_violation then
  return jsonb_build_object('status', 'invalid');
end;
$$;

create or replace function public.get_memory_attempt_uploads(p_attempt_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'asset_id', asset.id, 'object_path', object.object_path
  ) order by selection.position), '[]'::jsonb)
  from public.memory_attempts as attempt
  inner join public.memory_attempt_assets as selection on selection.attempt_id = attempt.id
  inner join public.memory_assets as asset on asset.id = selection.asset_id
  inner join public.memory_asset_objects as object on object.asset_id = asset.id
    and object.variant_type = 'original'
  where attempt.id = p_attempt_id and attempt.actor_user_id = private.current_user_id()
    and attempt.status = 'processing' and asset.staging_attempt_id = attempt.id;
$$;

create function private.mark_memory_asset_object(
  p_object_id uuid,
  p_status public.memory_asset_object_status,
  p_content_type text,
  p_byte_size bigint,
  p_failure_code text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  changed public.memory_asset_objects;
begin
  update public.memory_asset_objects as object set
    status = p_status,
    content_type = coalesce(p_content_type, object.content_type),
    byte_size = coalesce(p_byte_size, object.byte_size),
    failure_code = case when p_status = 'failed' then left(btrim(p_failure_code), 100) end,
    ready_at = case when p_status = 'ready' then pg_catalog.clock_timestamp() end
  from public.memory_assets as asset
  inner join public.memory_attempts as attempt on attempt.id = asset.staging_attempt_id
  where object.id = p_object_id and asset.id = object.asset_id
    and attempt.actor_user_id = private.current_user_id() and attempt.status = 'processing'
  returning object.* into changed;
  return jsonb_build_object('status', case when changed.id is null then 'unavailable' else p_status::text end);
end;
$$;

create function public.mark_memory_asset_object_processing(p_object_id uuid)
returns jsonb language sql security definer set search_path = '' as $$
  select private.mark_memory_asset_object(p_object_id, 'processing', null, null, null);
$$;

create function public.mark_memory_asset_object_ready(
  p_object_id uuid,
  p_content_type text,
  p_byte_size bigint
)
returns jsonb language sql security definer set search_path = '' as $$
  select private.mark_memory_asset_object(p_object_id, 'ready', p_content_type, p_byte_size, null);
$$;

create function public.mark_memory_asset_object_failed(p_object_id uuid, p_failure_code text)
returns jsonb language sql security definer set search_path = '' as $$
  select private.mark_memory_asset_object(p_object_id, 'failed', null, null, p_failure_code);
$$;

create function public.finalize_memory_attempt(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  attempt public.memory_attempts;
  memory public.memories;
  cover_id uuid;
begin
  select * into attempt from public.memory_attempts
  where id = p_attempt_id and actor_user_id = private.current_user_id() for update;
  if not found then return jsonb_build_object('status', 'unavailable'); end if;
  if attempt.status = 'completed' then
    return jsonb_build_object('status', 'completed', 'memory_id', attempt.memory_id,
      'visibility', attempt.visibility, 'updated_at', attempt.completed_at);
  end if;
  if attempt.status <> 'processing' or attempt.expires_at <= pg_catalog.clock_timestamp() then
    return jsonb_build_object('status', 'unavailable');
  end if;
  if exists (
    select 1 from public.memory_attempt_assets as selection
    inner join public.memory_assets as asset on asset.id = selection.asset_id
    where selection.attempt_id = attempt.id and asset.staging_attempt_id = attempt.id
      and (select count(*) from public.memory_asset_objects as object
        where object.asset_id = asset.id and object.variant_type in ('original', 'cover', 'detail')
          and object.status = 'ready') <> 3
  ) then return jsonb_build_object('status', 'invalid'); end if;

  if attempt.attempt_type = 'create' then
    insert into public.memories (
      space_id, creator_membership_id, creator_user_id, title, description,
      location, memory_date, visibility
    ) values (
      attempt.space_id, attempt.actor_membership_id, attempt.actor_user_id, attempt.title,
      attempt.description, attempt.location, attempt.memory_date, attempt.visibility
    ) returning * into memory;
    update public.memory_attempts set memory_id = memory.id where id = attempt.id;
  else
    select * into memory from public.memories
    where id = attempt.memory_id and space_id = attempt.space_id and deleted_at is null for update;
    if not found then
      update public.memory_attempts set status = 'failed', failure_code = 'unavailable' where id = attempt.id;
      return jsonb_build_object('status', 'unavailable');
    end if;
    if memory.updated_at <> attempt.expected_updated_at then
      update public.memory_attempts set status = 'conflict', failure_code = 'version_conflict'
      where id = attempt.id;
      return jsonb_build_object('status', 'conflict');
    end if;
    insert into public.resource_cleanup (resource_kind, resource_locator)
    select 'storage_object', object.object_path
    from public.memory_assets as asset
    inner join public.memory_asset_objects as object on object.asset_id = asset.id
    where asset.memory_id = memory.id and not exists (
      select 1 from public.memory_attempt_assets as selected
      where selected.attempt_id = attempt.id and selected.asset_id = asset.id
    ) on conflict (resource_kind, resource_locator) do nothing;
    update public.memories set cover_asset_id = null where id = memory.id;
    delete from public.memory_assets as asset where asset.memory_id = memory.id and not exists (
      select 1 from public.memory_attempt_assets as selected
      where selected.attempt_id = attempt.id and selected.asset_id = asset.id
    );
    update public.memory_assets set position = position + 1000 where memory_id = memory.id;
  end if;

  update public.memory_assets as asset set memory_id = memory.id, staging_attempt_id = null,
    position = selection.position
  from public.memory_attempt_assets as selection
  where selection.attempt_id = attempt.id and selection.asset_id = asset.id;
  select asset_id into cover_id from public.memory_attempt_assets
  where attempt_id = attempt.id and is_cover;
  update public.memories set title = attempt.title, description = attempt.description,
    location = attempt.location, memory_date = attempt.memory_date, visibility = attempt.visibility,
    cover_asset_id = cover_id where id = memory.id returning * into memory;
  update public.memory_attempts set status = 'completed', memory_id = memory.id,
    completed_at = pg_catalog.clock_timestamp() where id = attempt.id;
  return jsonb_build_object('status', 'completed', 'memory_id', memory.id,
    'visibility', memory.visibility, 'updated_at', memory.updated_at);
end;
$$;

create function public.fail_memory_attempt(p_attempt_id uuid, p_failure_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  update public.memory_attempts set status = 'failed', failure_code = left(btrim(p_failure_code), 100)
  where id = p_attempt_id and actor_user_id = private.current_user_id()
    and status in ('preparing', 'processing');
  if not found then return jsonb_build_object('status', 'unavailable'); end if;
  insert into public.resource_cleanup (resource_kind, resource_locator)
  select 'storage_object', object.object_path
  from public.memory_assets as asset
  inner join public.memory_asset_objects as object on object.asset_id = asset.id
  where asset.staging_attempt_id = p_attempt_id
  on conflict (resource_kind, resource_locator) do nothing;
  return jsonb_build_object('status', 'failed');
end;
$$;

create function public.get_available_memory(p_memory_id uuid)
returns public.memories language sql stable security invoker set search_path = '' as $$
  select memory from public.memories as memory where memory.id = p_memory_id;
$$;

create function public.place_memory(
  p_memory_id uuid,
  p_target_visibility public.memory_visibility,
  p_expected_updated_at timestamptz
)
returns table (
  memory_id uuid, outcome text, result_visibility public.memory_visibility,
  result_updated_at timestamptz
) language plpgsql security definer set search_path = '' as $$
declare
  membership public.space_members := private.active_membership();
  memory public.memories;
begin
  select * into memory from public.memories where id = p_memory_id
    and space_id = membership.space_id and deleted_at is null for update;
  if not found or memory.visibility = p_target_visibility then
    return query select null::uuid, 'unavailable'::text, null::public.memory_visibility, null::timestamptz;
  elsif memory.updated_at <> p_expected_updated_at then
    return query select null::uuid, 'conflict'::text, null::public.memory_visibility, null::timestamptz;
  else
    update public.memories set visibility = p_target_visibility where id = memory.id returning * into memory;
    return query select memory.id, 'completed'::text, memory.visibility, memory.updated_at;
  end if;
end;
$$;

create function public.delete_memory(p_memory_id text, p_expected_updated_at timestamptz)
returns table (outcome text) language plpgsql security definer set search_path = '' as $$
declare
  membership public.space_members := private.active_membership();
  memory public.memories;
  parsed_id uuid;
begin
  begin parsed_id := p_memory_id::uuid; exception when invalid_text_representation then
    return query select 'unavailable'::text; return;
  end;
  select * into memory from public.memories where id = parsed_id
    and space_id = membership.space_id and deleted_at is null for update;
  if not found then return query select 'unavailable'::text;
  elsif memory.updated_at <> p_expected_updated_at then return query select 'conflict'::text;
  else
    update public.memories set deleted_at = pg_catalog.clock_timestamp() where id = memory.id;
    return query select 'completed'::text;
  end if;
end;
$$;

create function public.can_mutate_memory_comment(p_memory_id uuid, p_comment_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memory_comments as comment
    inner join public.memories as memory on (memory.id, memory.space_id) = (comment.memory_id, comment.space_id)
    where comment.id = p_comment_id and comment.memory_id = p_memory_id
      and comment.author_user_id = private.current_user_id()
      and comment.deleted_at is null and memory.deleted_at is null
  );
$$;

create function public.create_memory_comment(
  p_memory_id uuid,
  p_idempotency_key uuid,
  p_body text,
  p_request_fingerprint text
)
returns table (
  comment_id uuid, memory_id uuid, space_id uuid, author_user_id uuid,
  author_display_name text, body text, created_at timestamptz, outcome text
) language plpgsql security definer set search_path = '' as $$
declare
  membership public.space_members := private.active_membership();
  comment public.memory_comments;
  normalized_body text := btrim(p_body);
begin
  if membership.id is null or not exists (select 1 from public.memories as memory
      where memory.id = p_memory_id and memory.space_id = membership.space_id
        and memory.deleted_at is null) then
    return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::timestamptz, 'unavailable'::text; return;
  end if;
  if char_length(normalized_body) not between 1 and 1000 or p_idempotency_key is null
    or p_request_fingerprint !~ '^[a-f0-9]{64}$' then
    return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::timestamptz, 'invalid'::text; return;
  end if;
  select comment_row.* into comment from public.memory_comments as comment_row
  where comment_row.author_user_id = membership.user_id
    and comment_row.idempotency_key = p_idempotency_key for update of comment_row;
  if found and (comment.memory_id <> p_memory_id
      or comment.request_fingerprint <> p_request_fingerprint) then
    return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::timestamptz, 'mismatch'::text; return;
  elsif not found then
    insert into public.memory_comments (
      memory_id, space_id, author_membership_id, author_user_id, body,
      idempotency_key, request_fingerprint
    ) values (
      p_memory_id, membership.space_id, membership.id, membership.user_id,
      normalized_body, p_idempotency_key, p_request_fingerprint
    ) returning * into comment;
  end if;
  if comment.deleted_at is not null then
    return query select null::uuid, null::uuid, null::uuid, null::uuid, null::text,
      null::text, null::timestamptz, 'unavailable'::text; return;
  end if;
  return query select comment.id, comment.memory_id, comment.space_id, comment.author_user_id,
    membership.display_name, comment.body, comment.created_at, 'completed'::text;
end;
$$;

create function public.update_memory_comment(
  p_memory_id uuid,
  p_comment_id uuid,
  p_expected_version integer,
  p_body text
)
returns table (
  comment_id uuid, memory_id uuid, author_user_id uuid, author_display_name text,
  body text, created_at timestamptz, updated_at timestamptz, version integer, outcome text
) language plpgsql security definer set search_path = '' as $$
declare
  membership public.space_members := private.active_membership();
  comment public.memory_comments;
  normalized_body text := btrim(p_body);
begin
  select comment_row.* into comment from public.memory_comments as comment_row
  inner join public.memories as memory
    on (memory.id, memory.space_id) = (comment_row.memory_id, comment_row.space_id)
  where comment_row.id = p_comment_id and comment_row.memory_id = p_memory_id
    and comment_row.author_membership_id = membership.id and comment_row.deleted_at is null
    and memory.deleted_at is null for update of comment_row;
  if not found then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'unavailable'::text;
  elsif char_length(normalized_body) not between 1 and 1000 or p_expected_version < 1 then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'invalid'::text;
  elsif comment.version <> p_expected_version then
    return query select null::uuid, null::uuid, null::uuid, null::text, null::text,
      null::timestamptz, null::timestamptz, null::integer, 'conflict'::text;
  else
    update public.memory_comments as comment_row
    set body = normalized_body, version = comment_row.version + 1
    where comment_row.id = comment.id returning comment_row.* into comment;
    return query select comment.id, comment.memory_id, comment.author_user_id,
      membership.display_name, comment.body, comment.created_at, comment.updated_at,
      comment.version, 'completed'::text;
  end if;
end;
$$;

create function public.delete_memory_comment(
  p_memory_id uuid,
  p_comment_id uuid,
  p_expected_version integer
)
returns table (outcome text) language plpgsql security definer set search_path = '' as $$
declare
  membership public.space_members := private.active_membership();
  comment public.memory_comments;
begin
  select comment_row.* into comment from public.memory_comments as comment_row
  inner join public.memories as memory
    on (memory.id, memory.space_id) = (comment_row.memory_id, comment_row.space_id)
  where comment_row.id = p_comment_id and comment_row.memory_id = p_memory_id
    and comment_row.author_membership_id = membership.id and comment_row.deleted_at is null
    and memory.deleted_at is null for update of comment_row;
  if not found or p_expected_version < 1 then return query select 'unavailable'::text;
  elsif comment.version <> p_expected_version then return query select 'conflict'::text;
  else
    update public.memory_comments set deleted_at = pg_catalog.clock_timestamp() where id = comment.id;
    return query select 'completed'::text;
  end if;
end;
$$;

create function public.get_memory_reaction_summary(p_memory_id uuid)
returns table (
  current_reaction text, heart_count bigint, laugh_count bigint, cry_count bigint,
  star_count bigint, reaction_members jsonb, outcome text
) language plpgsql security definer set search_path = '' as $$
declare membership public.space_members := private.active_membership();
begin
  if membership.id is null or not exists (select 1 from public.memories
      where id = p_memory_id and space_id = membership.space_id and deleted_at is null) then
    return query select null::text, null::bigint, null::bigint, null::bigint,
      null::bigint, null::jsonb, 'unavailable'::text; return;
  end if;
  return query select
    max(reaction.reaction_type) filter (where reaction.membership_id = membership.id),
    count(*) filter (where reaction.reaction_type = 'heart'),
    count(*) filter (where reaction.reaction_type = 'laugh'),
    count(*) filter (where reaction.reaction_type = 'cry'),
    count(*) filter (where reaction.reaction_type = 'star'),
    jsonb_build_object(
      'heart', coalesce(jsonb_agg(member.display_name order by member.display_name)
        filter (where reaction.reaction_type = 'heart'), '[]'::jsonb),
      'laugh', coalesce(jsonb_agg(member.display_name order by member.display_name)
        filter (where reaction.reaction_type = 'laugh'), '[]'::jsonb),
      'cry', coalesce(jsonb_agg(member.display_name order by member.display_name)
        filter (where reaction.reaction_type = 'cry'), '[]'::jsonb),
      'star', coalesce(jsonb_agg(member.display_name order by member.display_name)
        filter (where reaction.reaction_type = 'star'), '[]'::jsonb)
    ), 'completed'::text
  from public.memory_reactions as reaction
  inner join public.space_members as member on member.id = reaction.membership_id
    and member.deleted_at is null
  where reaction.memory_id = p_memory_id;
end;
$$;

create function public.toggle_memory_reaction(p_memory_id uuid, p_reaction_type text)
returns table (
  current_reaction text, heart_count bigint, laugh_count bigint, cry_count bigint,
  star_count bigint, reaction_members jsonb, outcome text
) language plpgsql security definer set search_path = '' as $$
declare
  membership public.space_members := private.active_membership();
  current_type text;
begin
  if membership.id is null or p_reaction_type not in ('heart', 'laugh', 'cry', 'star')
    or not exists (select 1 from public.memories where id = p_memory_id
      and space_id = membership.space_id and deleted_at is null) then
    return query select null::text, null::bigint, null::bigint, null::bigint,
      null::bigint, null::jsonb, 'unavailable'::text; return;
  end if;
  select reaction_type into current_type from public.memory_reactions
  where membership_id = membership.id and memory_id = p_memory_id for update;
  if current_type = p_reaction_type then
    delete from public.memory_reactions where membership_id = membership.id and memory_id = p_memory_id;
  else
    insert into public.memory_reactions (membership_id, space_id, memory_id, reaction_type)
    values (membership.id, membership.space_id, p_memory_id, p_reaction_type)
    on conflict (membership_id, memory_id) do update set reaction_type = excluded.reaction_type;
  end if;
  return query select * from public.get_memory_reaction_summary(p_memory_id);
end;
$$;

create function public.claim_resource_cleanup(p_batch_size integer default 100)
returns table (id bigint, resource_kind text, resource_locator text)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with claims as (
    select cleanup.id from public.resource_cleanup as cleanup
    where cleanup.cleaned_at is null
      and cleanup.cleanup_after <= pg_catalog.clock_timestamp()
      and coalesce(cleanup.retry_after, '-infinity'::timestamptz) <= pg_catalog.clock_timestamp()
      and coalesce(cleanup.locked_until, '-infinity'::timestamptz) <= pg_catalog.clock_timestamp()
    order by cleanup.id
    for update skip locked
    limit least(greatest(p_batch_size, 1), 500)
  )
  update public.resource_cleanup as cleanup set
    locked_until = pg_catalog.clock_timestamp() + interval '2 minutes',
    last_attempted_at = pg_catalog.clock_timestamp()
  from claims where cleanup.id = claims.id
  returning cleanup.id, cleanup.resource_kind, cleanup.resource_locator;
end;
$$;

create function public.complete_resource_cleanup(p_ids bigint[])
returns void language sql security definer set search_path = '' as $$
  update public.resource_cleanup set cleaned_at = pg_catalog.clock_timestamp(), locked_until = null,
    retry_after = null, last_failure_code = null where id = any(p_ids) and cleaned_at is null;
$$;

create function public.fail_resource_cleanup(p_ids bigint[], p_failure_code text)
returns void language sql security definer set search_path = '' as $$
  update public.resource_cleanup set attempt_count = attempt_count + 1,
    last_failure_code = left(btrim(p_failure_code), 100), locked_until = null,
    retry_after = pg_catalog.clock_timestamp()
      + least(interval '1 day', interval '1 minute' * power(2, least(attempt_count, 10))::double precision)
  where id = any(p_ids) and cleaned_at is null;
$$;

alter table public.users enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.rate_limits enable row level security;
alter table public.memories enable row level security;
alter table public.memory_attempts enable row level security;
alter table public.memory_assets enable row level security;
alter table public.memory_asset_objects enable row level security;
alter table public.memory_attempt_assets enable row level security;
alter table public.memory_comments enable row level security;
alter table public.memory_reactions enable row level security;
alter table public.resource_cleanup enable row level security;

create policy users_select on public.users for select to authenticated
using (id = private.current_user_id() or private.can_view_profile(id));
create policy spaces_select on public.spaces for select to authenticated
using (private.is_active_space_member(id));
create policy space_members_select on public.space_members for select to authenticated
using (private.is_active_space_member(space_id) and deleted_at is null);
create policy memories_select on public.memories for select to authenticated
using (deleted_at is null and private.is_active_space_member(space_id));
create policy memory_assets_select on public.memory_assets for select to authenticated
using (memory_id is not null and private.is_active_space_member(space_id));
create policy memory_asset_objects_select on public.memory_asset_objects for select to authenticated
using (exists (
  select 1 from public.memory_assets as asset
  where asset.id = memory_asset_objects.asset_id and asset.memory_id is not null
    and private.is_active_space_member(asset.space_id)
));
create policy memory_comments_select on public.memory_comments for select to authenticated
using (deleted_at is null and private.is_active_space_member(space_id) and exists (
  select 1 from public.memories as memory
  where (memory.id, memory.space_id) = (memory_comments.memory_id, memory_comments.space_id)
    and memory.deleted_at is null
));

create policy memory_objects_read on storage.objects for select to authenticated
using (
  bucket_id = 'memory-photos'
  and private.can_access_memory_asset_object(name, false)
);
create policy memory_objects_staged_read on storage.objects for select to authenticated
using (
  bucket_id = 'memory-photos'
  and private.can_access_memory_asset_object(name, true)
);
create policy memory_objects_staged_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'memory-photos'
  and private.can_access_memory_asset_object(name, true)
);
create policy memory_objects_staged_update on storage.objects for update to authenticated
using (
  bucket_id = 'memory-photos'
  and private.can_access_memory_asset_object(name, true)
)
with check (
  bucket_id = 'memory-photos'
  and private.can_access_memory_asset_object(name, true)
);

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
grant select on public.users to authenticated;
grant select on public.spaces, public.space_members, public.memories, public.memory_assets,
  public.memory_asset_objects, public.memory_comments to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated, service_role;
revoke execute on all functions in schema private from public, anon, authenticated, service_role;

grant usage on schema public to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.current_user_id(), private.is_active_space_member(uuid),
  private.can_view_profile(uuid), private.can_access_memory_asset_object(text, boolean)
to authenticated;

grant execute on function public.sync_current_user(text, text, text),
  public.create_space(text, text, date, text),
  public.get_active_space(), public.process_space_invite(text, text, boolean),
  public.regenerate_space_invite(), public.complete_space_setup(),
  public.get_active_space_settings(), public.rename_active_space(text, timestamptz),
  public.update_active_space_start_date(text, text, timestamptz),
  public.update_active_membership_display_name(text, timestamptz),
  public.prepare_memory_attempt(public.memory_attempt_type, uuid, timestamptz, text, text, text,
    date, text, public.memory_visibility, jsonb),
  public.get_memory_attempt_uploads(uuid), public.mark_memory_asset_object_processing(uuid),
  public.mark_memory_asset_object_ready(uuid, text, bigint),
  public.mark_memory_asset_object_failed(uuid, text), public.finalize_memory_attempt(uuid),
  public.fail_memory_attempt(uuid, text), public.get_available_memory(uuid),
  public.place_memory(uuid, public.memory_visibility, timestamptz),
  public.delete_memory(text, timestamptz), public.can_mutate_memory_comment(uuid, uuid),
  public.create_memory_comment(uuid, uuid, text, text),
  public.update_memory_comment(uuid, uuid, integer, text),
  public.delete_memory_comment(uuid, uuid, integer), public.get_memory_reaction_summary(uuid),
  public.toggle_memory_reaction(uuid, text)
to authenticated;

grant execute on function public.claim_resource_cleanup(integer),
  public.complete_resource_cleanup(bigint[]), public.fail_resource_cleanup(bigint[], text)
to service_role;
