-- STAGED DESIGN ONLY. Do not apply independently of the username service,
-- recovery-code implementation, abuse controls and an end-to-end rollout.
-- Keep the existing email/password account and its UUID unchanged.
-- Run after the community owner functions are installed.
create table if not exists public.account_usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint account_username_format check ((username collate "C") ~ '^[A-Za-z][A-Za-z0-9_]{1,23}$')
);
create unique index if not exists account_username_unique
  on public.account_usernames (lower(username collate "C"));
alter table public.account_usernames enable row level security;
revoke all on public.account_usernames from public, anon, authenticated;

create or replace function public.account_username_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if lower(new.username collate "C") = 'shay' then
    if not public.chat_is_owner(new.user_id) then
      raise exception 'This username is reserved.';
    end if;
  elsif public.chat_is_owner(new.user_id) then
    raise exception 'The owner username is reserved as Shay.';
  elsif public.nickname_restricted(new.username) then
    raise exception 'This username is reserved.';
  end if;
  return new;
end $$;
revoke all on function public.account_username_guard() from public, anon, authenticated;
drop trigger if exists account_username_guard on public.account_usernames;
create trigger account_username_guard before insert or update on public.account_usernames
  for each row execute function public.account_username_guard();

-- Fail closed if the existing owner is absent or unconfirmed. Do not create a
-- new owner, alter credentials, or overwrite another user's existing username.
do $$
declare owner_id uuid;
begin
  select id into owner_id from auth.users
    where lower(email) = 'parmars@ucs.org.uk' and email_confirmed_at is not null;
  if owner_id is null then raise exception 'Confirmed owner account not found.'; end if;
  insert into public.account_usernames(user_id,username) values(owner_id,'Shay')
  on conflict (user_id) do nothing;
  if not exists (select 1 from public.account_usernames where user_id=owner_id and username='Shay') then
    raise exception 'Owner username requires manual review.';
  end if;
end $$;
