-- Run once. Counts start when tracking is deployed; no historical backfill.
create table if not exists public.site_status_settings (id boolean primary key default true check(id), access_code text not null, created_at timestamptz not null default now());
insert into public.site_status_settings(id,access_code) values(true,replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')) on conflict (id) do nothing;
create table if not exists public.site_status_totals (id boolean primary key default true check(id), all_views bigint not null default 0, signed_views bigint not null default 0, started_at timestamptz not null default now());
insert into public.site_status_totals(id) values(true) on conflict (id) do nothing;
create table if not exists public.site_status_browsers (browser_id uuid primary key, first_seen timestamptz not null default now());
create table if not exists public.site_status_accounts (user_id uuid primary key references auth.users(id) on delete cascade, first_seen timestamptz not null default now());
create table if not exists public.site_status_sessions (session_id uuid primary key, browser_id uuid not null, user_id uuid references auth.users(id) on delete cascade, last_seen timestamptz not null default now(), last_view timestamptz);
create index if not exists site_status_sessions_seen on public.site_status_sessions(last_seen);
alter table public.site_status_settings enable row level security;
alter table public.site_status_totals enable row level security;
alter table public.site_status_browsers enable row level security;
alter table public.site_status_accounts enable row level security;
alter table public.site_status_sessions enable row level security;
revoke all on public.site_status_settings, public.site_status_totals, public.site_status_browsers, public.site_status_accounts, public.site_status_sessions from public, anon, authenticated;

-- No paths, page content, email addresses or IP addresses are stored by this tracker.
create or replace function public.site_status_ping(p_browser uuid,p_session uuid,p_view boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_count boolean := false; v_last timestamptz;
begin
 if p_browser is null or p_session is null or p_view is null then raise exception 'Invalid request'; end if;
 insert into public.site_status_browsers(browser_id) values(p_browser) on conflict do nothing;
 if v_user is not null then insert into public.site_status_accounts(user_id) values(v_user) on conflict do nothing; end if;
 insert into public.site_status_sessions(session_id,browser_id,user_id,last_seen,last_view) values(p_session,p_browser,v_user,now(),null) on conflict(session_id) do nothing;
 select last_view into v_last from public.site_status_sessions where session_id=p_session and browser_id=p_browser for update;
 if not found then raise exception 'Invalid session'; end if;
 v_count := p_view and (v_last is null or v_last < now()-interval '2 seconds');
 update public.site_status_sessions set user_id=v_user,last_seen=now(),last_view=case when v_count then now() else last_view end where session_id=p_session;
 if v_count then update public.site_status_totals set all_views=all_views+1,signed_views=signed_views+case when v_user is null then 0 else 1 end where id; end if;
 -- Opportunistic cleanup; the dashboard itself only counts the last three minutes.
 delete from public.site_status_sessions where last_seen < now()-interval '1 day';
end $$;

create or replace function public.site_status_is_owner() returns boolean language sql stable security definer set search_path = '' as $$
 select public.chat_is_owner(auth.uid());
$$;
create or replace function public.site_status_code() returns text language plpgsql security definer set search_path = '' as $$
begin
 if not public.chat_is_owner(auth.uid()) then raise exception 'Not authorised' using errcode='42501'; end if;
 return (select access_code from public.site_status_settings where id);
end $$;
create or replace function public.site_status_read(p_code text default null) returns jsonb language plpgsql security definer set search_path = '' as $$
declare answer jsonb;
begin
 if not public.chat_is_owner(auth.uid()) and not exists(select 1 from public.site_status_settings where id and access_code=p_code and length(p_code)=64) then
  raise exception 'Not authorised' using errcode='42501';
 end if;
 select jsonb_build_object('started_at',t.started_at,'all_views',t.all_views,'signed_views',t.signed_views,
 'unique_browsers',(select count(*) from public.site_status_browsers),
 'unique_accounts',(select count(*) from public.site_status_accounts),
 'guest_online',(select count(distinct browser_id) from public.site_status_sessions where user_id is null and last_seen>now()-interval '3 minutes'),
 'signed_online',(select count(distinct user_id) from public.site_status_sessions where user_id is not null and last_seen>now()-interval '3 minutes')) into answer from public.site_status_totals t where t.id;
 return answer;
end $$;
revoke all on function public.site_status_ping(uuid,uuid,boolean),public.site_status_is_owner(),public.site_status_code(),public.site_status_read(text) from public, anon, authenticated;
grant execute on function public.site_status_ping(uuid,uuid,boolean),public.site_status_is_owner(),public.site_status_read(text) to anon,authenticated;
grant execute on function public.site_status_code() to authenticated;
