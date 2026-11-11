-- Existing-project patch for the owner identity, safe object defaults, and AI quota definer routine.
-- Owner status uses trusted Supabase Auth app_metadata, never an email or
-- user-editable user_metadata value. Set site_owner=true through an admin path.

-- New application objects created by postgres in public must not become
-- directly callable/readable by browser roles unless a migration grants that
-- access deliberately. PostgreSQL grants function EXECUTE to PUBLIC by
-- default, so remove that global default for postgres-created functions;
-- explicitly grant needed RPC access in each function migration.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
create or replace function public.chat_is_owner(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null
    and raw_app_meta_data->>'site_owner'='true');
$$;
revoke all on function public.chat_is_owner(uuid) from public, anon, authenticated;
grant execute on function public.chat_is_owner(uuid) to service_role;

create or replace function public.ai_reserve_request(p_user_id uuid)
returns integer language plpgsql security definer
set search_path = ''
as $$
declare current_used integer;
begin
  if p_user_id is null then raise exception 'Missing user'; end if;
  insert into public.ai_daily_usage as usage_row (user_id, usage_day, used)
  values (p_user_id, (pg_catalog.now() at time zone 'UTC')::date, 1)
  on conflict (user_id, usage_day) do update
    set used = usage_row.used + 1
    where usage_row.used < 10
  returning used into current_used;
  return current_used; -- null means the allowance has already been used
end;
$$;
revoke all on function public.ai_reserve_request(uuid) from public, anon, authenticated;
grant execute on function public.ai_reserve_request(uuid) to service_role;

-- Username logins authenticate on the server instead of returning a private
-- login email. Login/recovery limits use a normalized username key before
-- protected lookup, so one username cannot exhaust a shared bucket for every
-- account. Existing projects must run auth_rate_limit_hardening.sql before
-- deploying the new function.
create or replace function public.account_auth_reserve(p_action text,p_subject text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare cap integer; current_count integer; v_subject text := coalesce(p_subject,'');
begin
  cap := case p_action when 'signup' then 30 when 'login' then 30 when 'recover' then 10 when 'codes' then 10 else null end;
  if cap is null or length(v_subject) not between 1 and 64 then return false; end if;
  insert into public.account_auth_limits as limits(action,subject_key,window_start,attempts) values(p_action,v_subject,clock_timestamp(),1)
  on conflict(action,subject_key) do update set
    attempts=case when limits.window_start < clock_timestamp()-interval '1 hour' then 1 else limits.attempts+1 end,
    window_start=case when limits.window_start < clock_timestamp()-interval '1 hour' then clock_timestamp() else limits.window_start end
  where limits.window_start < clock_timestamp()-interval '1 hour' or limits.attempts < cap
  returning attempts into current_count;
  if pg_catalog.random()<0.01 then delete from public.account_auth_limits where window_start < clock_timestamp()-interval '1 day'; end if;
  return current_count is not null;
end $$;
revoke all on function public.account_auth_reserve(text,text) from public, anon, authenticated;
grant execute on function public.account_auth_reserve(text,text) to service_role;
