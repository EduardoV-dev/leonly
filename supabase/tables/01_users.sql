create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint users_name_length_check
    check (char_length(btrim(name)) between 1 and 100),

  constraint users_email_not_blank_check
    check (char_length(btrim(email)) > 0)
);

create unique index if not exists users_email_unique_idx
  on public.users (lower(email));

create index if not exists users_is_active_idx
  on public.users (is_active);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();
