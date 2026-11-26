-- Synthetic reduced legacy shapes. Only the reviewed definitions are exact.
-- PGlite's reduced Auth fixture needs this column. Real Supabase already has it
-- and postgres does not own auth.users: do not issue ALTER there, even IF NOT EXISTS.
do $$ begin
 if not exists(select 1 from pg_attribute where attrelid='auth.users'::regclass
  and attname='raw_user_meta_data' and not attisdropped) then
  alter table auth.users add column raw_user_meta_data jsonb default '{}';
 end if;
end $$;
create table public.authentication_mode_user_roles(id integer primary key,email text unique not null,role text not null default 'viewer',name text,auth_user_id uuid unique,updated_at timestamptz default now());
create table public.chatak_profiles(id uuid primary key,email text);
create table public.alarm_settings(user_id uuid primary key);
create table public.code_sensei_users(id uuid primary key,name text not null default 'Synthetic');
create table public.code_sensei_user_notes(id uuid primary key default gen_random_uuid(),user_id uuid references public.code_sensei_users,note_text text not null);
create table public.code_sensei_progress(id uuid primary key default gen_random_uuid(),user_id uuid references public.code_sensei_users,topic_id text,status text);
create table public.healthlog_visits_old(id uuid primary key default gen_random_uuid(),user_id text not null,notes text);
-- Mapping validation also accepts keys belonging only to an archived clinic or dose.
create table public.healthlog_clinics_old(id uuid primary key default gen_random_uuid(),user_id text not null);
create table public.healthlog_dose_logs_old(user_id text not null);
create table public.logi_projects(id uuid primary key);
create table public.logi_assemblies(id uuid primary key,project_id uuid references public.logi_projects on delete cascade);
create table public.logi_versions(id uuid primary key,assembly_id uuid references public.logi_assemblies on delete cascade);
create table public.eagle_units(id uuid primary key,assembly_id uuid references public.logi_assemblies on delete cascade,version_id uuid references public.logi_versions on delete set null);
create table public.eagle_unit_progress(id uuid primary key default gen_random_uuid(),unit_id uuid references public.eagle_units on delete cascade,node_id uuid,status text not null default 'todo',notes text);
create table public.roadmap_tasks(id uuid primary key,user_id uuid not null default auth.uid(),title text,parent_id uuid references public.roadmap_tasks on delete cascade);
create table public.roadmap_study_sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),task_id uuid references public.roadmap_tasks on delete cascade,day_key text not null,source text not null,started_at timestamptz,
 completed_at timestamptz,duration_min integer,feedback jsonb not null default '{}',verification text default 'app',unique(task_id,day_key));
grant all on public.authentication_mode_user_roles,public.code_sensei_users,public.code_sensei_user_notes,public.code_sensei_progress,public.healthlog_visits_old,public.eagle_unit_progress,public.eagle_units,public.logi_assemblies,public.logi_projects,public.logi_versions,public.roadmap_tasks,public.roadmap_study_sessions to anon,authenticated,service_role;
alter table public.authentication_mode_user_roles enable row level security;
create policy own_role on public.authentication_mode_user_roles for select using(auth.uid()=auth_user_id);
alter table public.code_sensei_users enable row level security;
alter table public.code_sensei_user_notes enable row level security;
alter table public.code_sensei_progress enable row level security;
alter table public.healthlog_visits_old enable row level security;
alter table public.eagle_units enable row level security;
alter table public.eagle_unit_progress enable row level security;
alter table public.roadmap_tasks enable row level security;
alter table public.roadmap_study_sessions enable row level security;
create policy allow_all on public.code_sensei_users for all using(true) with check(true);
create policy allow_all on public.code_sensei_user_notes for all using(true) with check(true);
create policy allow_all on public.code_sensei_progress for all using(true) with check(true);
create policy "all visits" on public.healthlog_visits_old for all using(true) with check(true);
create policy eagle_units_authenticated_all on public.eagle_units for all to authenticated using(true) with check(true);
create policy eagle_unit_progress_authenticated_all on public.eagle_unit_progress for all to authenticated using(true) with check(true);
create policy roadmap_tasks_owner on public.roadmap_tasks for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy roadmap_study_sessions_owner on public.roadmap_study_sessions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
CREATE OR REPLACE FUNCTION public.chatak_enforce_allowlist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  if not exists (
    select 1 from public.authentication_mode_user_roles
    where lower(email) = lower(new.email)
  ) then
    raise exception 'not_allowed';
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.chatak_handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.chatak_profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $function$
;
CREATE OR REPLACE FUNCTION public.chatak_link_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  update public.authentication_mode_user_roles
     set auth_user_id = new.id, updated_at = now()
   where lower(email) = lower(new.email)
     and (auth_user_id is null or auth_user_id <> new.id);
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_next int;
begin
  -- claim an id whether or not the column carries a sequence default
  select coalesce(max(id), 0) + 1 into v_next
  from public.authentication_mode_user_roles;

  insert into public.authentication_mode_user_roles (id, email, role, name, auth_user_id)
  values (v_next, new.email, 'operator',
          coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
          new.id)
  on conflict (auth_user_id) do nothing;

  -- link an existing row that was created before the account
  update public.authentication_mode_user_roles
     set auth_user_id = new.id
   where auth_user_id is null and lower(email) = lower(new.email);

  insert into public.alarm_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.roadmap_start_session(p_task_id uuid, p_day_key text, p_source text DEFAULT 'roadmap'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  insert into roadmap_study_sessions (task_id, day_key, source, started_at)
  values (p_task_id, p_day_key, p_source, now())
  on conflict (task_id, day_key) do update
    set started_at = coalesce(roadmap_study_sessions.started_at, now())
  returning id into v_id;
  return v_id;
end;
$function$
;
create trigger chatak_allowlist_gate before insert on auth.users for each row execute function public.chatak_enforce_allowlist();
create trigger chatak_link_auth_user after insert on auth.users for each row execute function public.chatak_link_auth_user();
create trigger chatak_on_auth_user_created after insert on auth.users for each row execute function public.chatak_handle_new_user();
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
CREATE OR REPLACE FUNCTION public.roadmap_complete_session(p_task_id uuid, p_source text, p_day_key text DEFAULT NULL::text, p_duration integer DEFAULT NULL::integer, p_feedback jsonb DEFAULT '{}'::jsonb, p_verification text DEFAULT 'app'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_day text := coalesce(p_day_key, to_char(now() - interval '4 hours', 'YYYY-MM-DD'));
  v_id uuid;
begin
  if v_uid is null then raise exception using errcode = '42501', message = 'roadmap_complete_session: sign-in required'; end if;
  if p_verification not in ('app','api','manual') then raise exception 'bad verification: %', p_verification; end if;
  if not exists (select 1 from roadmap_tasks t where t.id = p_task_id and t.user_id = v_uid) then
    raise exception using errcode = '42501', message = 'roadmap_complete_session: not your task';
  end if;
  insert into roadmap_study_sessions (user_id, task_id, day_key, source, completed_at, duration_min, feedback, verification)
  values (v_uid, p_task_id, v_day, p_source, now(), p_duration, p_feedback, p_verification)
  on conflict (task_id, day_key) do update
    set user_id      = v_uid,
        completed_at = now(),
        duration_min = coalesce(excluded.duration_min, roadmap_study_sessions.duration_min),
        feedback     = roadmap_study_sessions.feedback || excluded.feedback,
        source       = excluded.source,
        verification = excluded.verification
    where roadmap_study_sessions.user_id = v_uid or roadmap_study_sessions.user_id is null
  returning id into v_id;
  return v_id;
end $function$;

-- Disposable equivalent of the shared Tokyo-day budget contract. Both the
-- service reservation and counter run in a real database transaction.
create table public.akatsuki_fn_budget(fn text,day date,n integer not null,primary key(fn,day));
revoke all on public.akatsuki_fn_budget from public,anon,authenticated;
create function public.akatsuki_fn_budget_take(p_fn text,p_cap integer) returns integer
language plpgsql security definer set search_path='' as $$
declare used integer;
begin
 insert into public.akatsuki_fn_budget as b values(p_fn,(now() at time zone 'Asia/Tokyo')::date,1)
 on conflict(fn,day) do update set n=b.n+1 returning n into used;
 if used>p_cap then raise exception 'daily limit' using errcode='AK210'; end if;
 return used;
end; $$;
revoke all on function public.akatsuki_fn_budget_take(text,integer) from public,anon,authenticated;
grant execute on function public.akatsuki_fn_budget_take(text,integer) to service_role;
