create or replace function public.set_invite_code_expiry()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.invite_code is not null
    and (tg_op = 'INSERT' or new.invite_code is distinct from old.invite_code) then
    new.invite_code_expires_at := now() + interval '24 hours';
  end if;

  return new;
end;
$$;

drop trigger if exists set_spaces_invite_code_expiry on public.spaces;
create trigger set_spaces_invite_code_expiry
before insert or update of invite_code on public.spaces
for each row
execute function public.set_invite_code_expiry();
