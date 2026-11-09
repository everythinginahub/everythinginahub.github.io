-- Staged only: a trusted service must authenticate code issuance, authorize
-- password resets, rate-limit attempts, and integrate these routines safely.
-- Never expose raw codes or service credentials to the database client.
create table if not exists public.account_recovery_codes (
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, code_hash)
);
alter table public.account_recovery_codes enable row level security;
revoke all on public.account_recovery_codes from public, anon, authenticated;

-- Call only after the service has authenticated the user (or while registering
-- a newly created account), and return raw codes only once over TLS. Replacing
-- a set invalidates the old set in the same transaction.
create or replace function public.account_recovery_replace(p_user_id uuid, p_hashes text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user_id is null or p_hashes is null or cardinality(p_hashes) <> 5
    or exists(select 1 from unnest(p_hashes) h where h is null or h !~ '^[0-9a-f]{64}$')
    or (select count(distinct h) from unnest(p_hashes) h) <> 5 then
    raise exception 'Invalid recovery set';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 720131));
  delete from public.account_recovery_codes where user_id = p_user_id;
  insert into public.account_recovery_codes(user_id,code_hash)
    select p_user_id, h from unnest(p_hashes) h;
end $$;

-- Consumes a code atomically; only one concurrent request can succeed. A
-- failure after consumption can burn a code, so recovery must handle uncertain
-- outcomes honestly and allow another unused code. Never retry automatically.
create or replace function public.account_recovery_consume(p_user_id uuid, p_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare consumed integer;
begin
  if p_user_id is null or p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 720131));
  delete from public.account_recovery_codes where user_id = p_user_id and code_hash = p_hash;
  get diagnostics consumed = row_count;
  return consumed = 1;
end $$;
revoke all on function public.account_recovery_replace(uuid,text[]), public.account_recovery_consume(uuid,text) from public, anon, authenticated;
grant execute on function public.account_recovery_replace(uuid,text[]), public.account_recovery_consume(uuid,text) to service_role;
