-- Count attempts, not prompts. A request is reserved atomically before calling Gemini.
-- Reset is midnight UTC; provider quotas may reset on a different schedule.
create table if not exists public.ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null,
  used integer not null check (used between 1 and 10),
  primary key (user_id, usage_day)
);
alter table public.ai_daily_usage enable row level security;
revoke all on public.ai_daily_usage from public, anon, authenticated;

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
