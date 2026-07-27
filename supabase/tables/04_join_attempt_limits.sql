create table if not exists public.join_attempt_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failed_attempts timestamptz[] not null default '{}',
  locked_until timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),

  constraint join_attempt_limits_failed_attempts_check
    check (cardinality(failed_attempts) <= 5)
);

alter table public.join_attempt_limits enable row level security;

revoke all on table public.join_attempt_limits from public;
revoke all on table public.join_attempt_limits from anon;
revoke all on table public.join_attempt_limits from authenticated;
