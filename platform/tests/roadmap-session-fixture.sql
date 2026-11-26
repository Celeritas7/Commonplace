-- Exact reviewed task/session shapes; synthetic records only.
drop table public.roadmap_study_sessions,public.roadmap_tasks;
create table public.roadmap_tasks (
 id uuid not null default gen_random_uuid(),
 user_id uuid not null default auth.uid(),
 parent_id uuid,
 title text not null,
 done boolean default false,
 kind text default 'task'::text,
 position integer default 0,
 expanded boolean default true,
 tags text[] default '{}'::text[],
 created_at timestamp with time zone default now(),
 updated_at timestamp with time zone default now(),
 streak integer not null default 0,
 streak_day date
);
create table public.roadmap_study_sessions (
 id uuid not null default gen_random_uuid(),
 user_id uuid not null default auth.uid(),
 task_id uuid,
 day_key text not null,
 source text not null,
 started_at timestamp with time zone,
 completed_at timestamp with time zone,
 duration_min integer,
 feedback jsonb not null default '{}'::jsonb,
 verification text not null default 'manual'::text,
 created_at timestamp with time zone not null default now()
);
alter table public.roadmap_tasks add constraint roadmap_tasks_kind_check CHECK ((kind = ANY (ARRAY['task'::text, 'group'::text])));
alter table public.roadmap_tasks add constraint roadmap_tasks_pkey PRIMARY KEY (id);
alter table public.roadmap_study_sessions add constraint roadmap_study_sessions_pkey PRIMARY KEY (id);
alter table public.roadmap_study_sessions add constraint roadmap_study_sessions_task_id_day_key_key UNIQUE (task_id, day_key);
alter table public.roadmap_study_sessions add constraint roadmap_study_sessions_verification_check CHECK ((verification = ANY (ARRAY['app'::text, 'api'::text, 'manual'::text])));
alter table public.roadmap_tasks add constraint roadmap_tasks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES roadmap_tasks(id) ON DELETE CASCADE;
alter table public.roadmap_study_sessions add constraint roadmap_study_sessions_task_id_fkey FOREIGN KEY (task_id) REFERENCES roadmap_tasks(id) ON DELETE CASCADE;
alter table public.roadmap_tasks enable row level security;
grant all on public.roadmap_tasks to anon,authenticated,service_role;
create policy roadmap_tasks_owner on public.roadmap_tasks for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
alter table public.roadmap_study_sessions enable row level security;
grant all on public.roadmap_study_sessions to anon,authenticated,service_role;
create policy roadmap_study_sessions_owner on public.roadmap_study_sessions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create function public.roadmap_set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger roadmap_tasks_set_updated_at before update on public.roadmap_tasks for each row execute function public.roadmap_set_updated_at();

create view public.roadmap_session_days with (security_invoker=true) as
 select task_id,day_key,verification,duration_min,feedback from public.roadmap_study_sessions where completed_at is not null;
grant select on public.roadmap_session_days to anon,authenticated,service_role;
