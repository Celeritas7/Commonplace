-- My Scripts progress: one row per user per script (notes, spaced-repeat levels, saved code, log).
-- Run once in the Supabase SQL editor.
create table if not exists public.py_my_scripts (
  user_id uuid not null references auth.users(id) on delete cascade,
  script_id text not null,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, script_id)
);
alter table public.py_my_scripts enable row level security;
drop policy if exists "own scripts select" on public.py_my_scripts;
drop policy if exists "own scripts insert" on public.py_my_scripts;
drop policy if exists "own scripts update" on public.py_my_scripts;
create policy "own scripts select" on public.py_my_scripts for select using (auth.uid() = user_id);
create policy "own scripts insert" on public.py_my_scripts for insert with check (auth.uid() = user_id);
create policy "own scripts update" on public.py_my_scripts for update using (auth.uid() = user_id);
