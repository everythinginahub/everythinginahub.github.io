-- Existing-project migration for per-account authentication limits.
-- Keep the one-argument service-role wrapper during deployment so v2 of
-- username-auth remains callable until the updated function is active.
alter table public.account_auth_limits
  add column if not exists subject_key text not null default 'global';
alter table public.account_auth_limits
  drop constraint if exists account_auth_limits_pkey;
alter table public.account_auth_limits
  add constraint account_auth_limits_pkey primary key(action,subject_key);

create or replace function public.account_auth_reserve(p_action text,p_subject text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare cap integer; current_count integer; v_subject text := coalesce(p_subject,'');
begin
  cap := case p_action
    when 'signup' then 30
    when 'login' then 30
    when 'login_unknown' then 600
    when 'recover' then 10
    when 'recover_unknown' then 120
    when 'codes' then 10
    when 'codes_legacy' then 120
    else null end;
  if cap is null or length(v_subject) not between 1 and 64 then return false; end if;
  insert into public.account_auth_limits as limits(action,subject_key,window_start,attempts)
    values(p_action,v_subject,clock_timestamp(),1)
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

-- Transitional wrapper for the deployed Edge Function until it is updated.
create or replace function public.account_auth_reserve(p_action text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  return case p_action
    when 'signup' then public.account_auth_reserve('signup','global')
    when 'login' then public.account_auth_reserve('login_unknown','legacy')
    when 'resolve' then public.account_auth_reserve('login_unknown','legacy')
    when 'recover' then public.account_auth_reserve('recover_unknown','legacy')
    when 'codes' then public.account_auth_reserve('codes_legacy','legacy')
    else false end;
end $$;
revoke all on function public.account_auth_reserve(text) from public, anon, authenticated;
grant execute on function public.account_auth_reserve(text) to service_role;
