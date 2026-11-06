-- Run once in the Supabase SQL Editor for your project.
-- Each learner can only read or write the row matching their authenticated user ID.
create table if not exists public.revision_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  constraint progress_size_limit check (octet_length(progress::text) <= 100000)
);

alter table public.revision_progress enable row level security;
revoke all on public.revision_progress from public, anon, authenticated;
grant select, insert, update on public.revision_progress to authenticated;

drop policy if exists "Read own progress" on public.revision_progress;
create policy "Read own progress" on public.revision_progress for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Insert own progress" on public.revision_progress;
create policy "Insert own progress" on public.revision_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Update own progress" on public.revision_progress;
create policy "Update own progress" on public.revision_progress for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
