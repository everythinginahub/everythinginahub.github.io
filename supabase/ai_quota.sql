-- AI request protection without a per-account daily allowance.
-- Each confirmed account may reserve up to 12 attempts in one fixed 60-second window;
-- The selected upstream provider's plan quotas, rate limits and billing settings remain
-- the long-term limit. The table stores only the latest window, never prompts or answers.
create table if not exists public.ai_request_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  used integer not null check (used between 1 and 12)
);
alter table public.ai_request_limits enable row level security;
revoke all on table public.ai_request_limits from public, anon, authenticated;

create or replace function public.ai_reserve_request(p_user_id uuid)
returns integer language plpgsql security definer
set search_path = ''
as $$
declare
  current_used integer;
  request_time timestamptz := pg_catalog.clock_timestamp();
begin
  if p_user_id is null then raise exception 'Missing user'; end if;
  insert into public.ai_request_limits as request_row (user_id, window_start, used)
  values (p_user_id, request_time, 1)
  on conflict (user_id) do update
    set window_start = case
      when request_row.window_start <= request_time - interval '1 minute' then request_time
      else request_row.window_start
    end,
    used = case
      when request_row.window_start <= request_time - interval '1 minute' then 1
      else request_row.used + 1
    end
    where request_row.window_start <= request_time - interval '1 minute'
       or request_row.used < 12
  returning used into current_used;
  return current_used; -- null means the short-term rate limit has been reached
end;
$$;
revoke all on function public.ai_reserve_request(uuid) from public, anon, authenticated;
grant execute on function public.ai_reserve_request(uuid) to service_role;

-- The old daily counters are no longer used and contain no prompt content.
-- Drop them so a removed daily limit does not leave unnecessary historical rows.
drop table if exists public.ai_daily_usage;
