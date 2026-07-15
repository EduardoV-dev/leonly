create extension if not exists pgcrypto;

create type public.space_member_role as enum ('owner', 'partner');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
