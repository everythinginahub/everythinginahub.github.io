-- Deployed to the connected Supabase project as migration 20261116183730 (site_feedback).
-- Anonymous, private feedback intake. Only the site-feedback Edge Function
-- may submit through the security-definer function; browser roles cannot read
-- or write these tables directly.
create table if not exists public.site_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  category text not null check (category in ('suggestion', 'problem', 'other')),
  message text not null check (char_length(message) between 10 and 1500 and message = btrim(message)),
  page text not null check (page ~ '^[a-z0-9-]{1,40}$')
);

create table if not exists public.site_feedback_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  submissions integer not null check (submissions between 0 and 5)
);

alter table public.site_feedback enable row level security;
alter table public.site_feedback_rate_limits enable row level security;
revoke all on public.site_feedback, public.site_feedback_rate_limits from public, anon, authenticated, service_role;

create or replace function public.site_feedback_submit(
  p_ip_hash text,
  p_category text,
  p_message text,
  p_page text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_limit public.site_feedback_rate_limits%rowtype;
  v_message text;
  v_page text;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then
    raise exception using message = 'invalid_feedback_request';
  end if;
  if p_category is null or p_category not in ('suggestion', 'problem', 'other') then
    raise exception using message = 'invalid_feedback_request';
  end if;
  if p_message is null then
    raise exception using message = 'invalid_feedback_request';
  end if;
  v_message := btrim(p_message);
  if char_length(v_message) not between 10 and 1500 then
    raise exception using message = 'invalid_feedback_request';
  end if;
  v_page := coalesce(nullif(p_page, ''), 'website');
  if v_page !~ '^[a-z0-9-]{1,40}$' then
    v_page := 'website';
  end if;

  insert into public.site_feedback_rate_limits(ip_hash, window_started_at, submissions)
    values (p_ip_hash, v_now, 0)
    on conflict (ip_hash) do nothing;
  select * into v_limit
    from public.site_feedback_rate_limits
    where ip_hash = p_ip_hash
    for update;

  if v_now - v_limit.window_started_at >= interval '1 hour' then
    update public.site_feedback_rate_limits
      set window_started_at = v_now, submissions = 1
      where ip_hash = p_ip_hash;
  elsif v_limit.submissions >= 5 then
    raise exception using message = 'feedback_rate_limited';
  else
    update public.site_feedback_rate_limits
      set submissions = submissions + 1
      where ip_hash = p_ip_hash;
  end if;

  insert into public.site_feedback(category, message, page)
    values (p_category, v_message, v_page);

  -- Remove inactive rate-limit fingerprints during successful submissions.
  delete from public.site_feedback_rate_limits
    where window_started_at < v_now - interval '24 hours';
end;
$$;

revoke all on function public.site_feedback_submit(text, text, text, text) from public, anon, authenticated;
grant execute on function public.site_feedback_submit(text, text, text, text) to service_role;
