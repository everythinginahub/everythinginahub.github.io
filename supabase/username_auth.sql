-- Apply after community owner functions and username_recovery.sql.
-- Keep the existing email/password owner account and its UUID unchanged.
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

-- These privileged routines are callable only from the trusted Edge Function.
-- Every new account gets an unrouteable, random internal address. The client
-- never supplies the address or user id when registering.
create or replace function public.account_username_finalize(p_user_id uuid, p_username text, p_hashes text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.account_usernames(user_id,username) values(p_user_id,p_username);
  perform public.account_recovery_replace(p_user_id,p_hashes);
end $$;

create or replace function public.account_username_resolve(p_username text)
returns table(user_id uuid, login_email text) language sql stable security definer set search_path = '' as $$
  select u.id, u.email::text from public.account_usernames n join auth.users u on u.id=n.user_id
  where lower(n.username collate "C")=lower(p_username collate "C") and u.email_confirmed_at is not null
  limit 1;
$$;
revoke all on function public.account_username_finalize(uuid,text,text[]), public.account_username_resolve(text) from public, anon, authenticated;
grant execute on function public.account_username_finalize(uuid,text,text[]), public.account_username_resolve(text) to service_role;

-- A global ceiling prevents unlimited privileged account creation/reset abuse.
-- It can be exhausted by hostile traffic, so monitor and add CAPTCHA before
-- scaling public signup. Password sign-in itself uses Supabase's IP limits.
create table if not exists public.account_auth_limits (
  action text primary key, window_start timestamptz not null, attempts integer not null
);
alter table public.account_auth_limits enable row level security;
revoke all on public.account_auth_limits from public, anon, authenticated;
create or replace function public.account_auth_reserve(p_action text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare cap integer; current_count integer;
begin
  cap := case p_action when 'signup' then 30 when 'recover' then 120 when 'resolve' then 600 when 'codes' then 120 else null end;
  if cap is null then return false; end if;
  insert into public.account_auth_limits(action,window_start,attempts) values(p_action,clock_timestamp(),1)
  on conflict(action) do update set
    attempts=case when public.account_auth_limits.window_start < clock_timestamp()-interval '1 hour' then 1 else public.account_auth_limits.attempts+1 end,
    window_start=case when public.account_auth_limits.window_start < clock_timestamp()-interval '1 hour' then clock_timestamp() else public.account_auth_limits.window_start end
  where public.account_auth_limits.window_start < clock_timestamp()-interval '1 hour' or public.account_auth_limits.attempts < cap
  returning attempts into current_count;
  return current_count is not null;
end $$;
revoke all on function public.account_auth_reserve(text) from public, anon, authenticated;
grant execute on function public.account_auth_reserve(text) to service_role;
