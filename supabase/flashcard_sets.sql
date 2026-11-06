-- User-created sets: private by default; public sets visible to signed-in users only.
create table if not exists public.flashcard_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 100),
  subject text not null check (char_length(trim(subject)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  is_public boolean not null default false,
  cards jsonb not null check (jsonb_typeof(cards) = 'array' and jsonb_array_length(cards) between 1 and 50 and octet_length(cards::text) <= 60000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists flashcard_sets_owner_idx on public.flashcard_sets(owner_id);
create index if not exists flashcard_sets_public_created_idx on public.flashcard_sets(created_at desc) where is_public;
alter table public.flashcard_sets enable row level security;
revoke all on public.flashcard_sets from public, anon, authenticated;
grant select, insert, update, delete on public.flashcard_sets to authenticated;
create policy "View own and public sets" on public.flashcard_sets for select to authenticated
  using (is_public or (select auth.uid()) = owner_id);
create policy "Create own sets" on public.flashcard_sets for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Update own sets" on public.flashcard_sets for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Delete own sets" on public.flashcard_sets for delete to authenticated
  using ((select auth.uid()) = owner_id);
