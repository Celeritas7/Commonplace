-- Game layer state: one row per user (streak, freezes, daily quests).
-- Run once in the Supabase SQL editor.
create table if not exists public.py_game_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.py_game_state enable row level security;
drop policy if exists "own state select" on public.py_game_state;
drop policy if exists "own state insert" on public.py_game_state;
drop policy if exists "own state update" on public.py_game_state;
create policy "own state select" on public.py_game_state for select using (auth.uid() = user_id);
create policy "own state insert" on public.py_game_state for insert with check (auth.uid() = user_id);
create policy "own state update" on public.py_game_state for update using (auth.uid() = user_id);
