-- sql_user_state — one row per user holding the SQL book's synced state.
-- Written for lib/sql-sync.js. Run it once in the Supabase SQL editor; it is not run by the app.
--   progress : commonplace_module_exercises_progress  ({"ex_4_1_1": "done", …})
--   checks   : cp_sql_check                           ({"04": {pass, right, asked, at}, …})
--   bank     : cp_sql_bank                            ([{id, src, …, updated, due, step, state}, …])

create table if not exists public.sql_user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  progress   jsonb not null default '{}'::jsonb,
  checks     jsonb not null default '{}'::jsonb,
  bank       jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.sql_user_state enable row level security;

drop policy if exists "sql_user_state select own" on public.sql_user_state;
create policy "sql_user_state select own" on public.sql_user_state
  for select using (user_id = auth.uid());

drop policy if exists "sql_user_state insert own" on public.sql_user_state;
create policy "sql_user_state insert own" on public.sql_user_state
  for insert with check (user_id = auth.uid());

drop policy if exists "sql_user_state update own" on public.sql_user_state;
create policy "sql_user_state update own" on public.sql_user_state
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
