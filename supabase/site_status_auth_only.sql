-- Existing-project migration: stop anonymous status writes and cap each account's
-- status/presence pings. Historical aggregates are retained; new pings are signed-in only.
create table if not exists public.site_status_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  attempts integer not null check (attempts >= 0)
);
alter table public.site_status_rate_limits enable row level security;
revoke all on public.site_status_rate_limits from public, anon, authenticated;

create or replace function public.site_status_ping(p_browser uuid,p_session uuid,p_view boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_count boolean := false; v_last timestamptz; v_attempts integer;
begin
 if v_user is null then raise exception 'Sign in to update status.' using errcode='42501'; end if;
 if p_browser is null or p_session is null or p_view is null then raise exception 'Invalid request'; end if;
 insert into public.site_status_rate_limits as rate(user_id,window_start,attempts) values(v_user,clock_timestamp(),1)
 on conflict(user_id) do update set
  attempts=case when rate.window_start < clock_timestamp()-interval '1 hour' then 1 else rate.attempts+1 end,
  window_start=case when rate.window_start < clock_timestamp()-interval '1 hour' then clock_timestamp() else rate.window_start end
 where rate.window_start < clock_timestamp()-interval '1 hour' or rate.attempts < 300
 returning attempts into v_attempts;
 if v_attempts is null then return; end if;
 insert into public.site_status_browsers(browser_id) values(p_browser) on conflict do nothing;
 insert into public.site_status_accounts(user_id) values(v_user) on conflict do nothing;
 insert into public.site_status_sessions(session_id,browser_id,user_id,last_seen,last_view) values(p_session,p_browser,v_user,now(),null) on conflict(session_id) do nothing;
 select last_view into v_last from public.site_status_sessions where session_id=p_session and browser_id=p_browser for update;
 if not found then raise exception 'Invalid session'; end if;
 v_count := p_view and (v_last is null or v_last < now()-interval '2 seconds');
 update public.site_status_sessions set user_id=v_user,last_seen=now(),last_view=case when v_count then now() else last_view end where session_id=p_session;
 if v_count then update public.site_status_totals set all_views=all_views+1,signed_views=signed_views+1 where id; end if;
 delete from public.site_status_sessions where last_seen < now()-interval '1 day';
 if pg_catalog.random()<0.01 then delete from public.site_status_rate_limits where window_start < clock_timestamp()-interval '1 day'; end if;
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
 'signed_online',(select count(distinct user_id) from public.site_status_sessions where user_id is not null and last_seen>now()-interval '3 minutes'),
 'guest_online',0) into answer from public.site_status_totals t where t.id;
 return answer;
end $$;

revoke all on function public.site_status_ping(uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function public.site_status_ping(uuid,uuid,boolean) to authenticated;
revoke all on function public.site_status_read(text) from public, anon, authenticated;
grant execute on function public.site_status_read(text) to anon, authenticated;
