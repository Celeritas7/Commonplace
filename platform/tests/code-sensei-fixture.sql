-- Catalog-derived shapes with synthetic defaults only. Never run against a hosted project.
drop table public.code_sensei_user_notes, public.code_sensei_progress, public.code_sensei_users;
create sequence public.code_sensei_attempts_id_seq;
create table public.code_sensei_attempts (
 id integer default nextval('code_sensei_attempts_id_seq'::regclass) not null,
 exercise_id integer not null,
 attempt_number integer not null,
 code text,
 mistake_log text,
 result text,
 notes text,
 created_at timestamp with time zone default now()
);
alter table public.code_sensei_attempts enable row level security;
create policy "allow_all" on public.code_sensei_attempts as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_attempts add constraint code_sensei_attempts_pkey PRIMARY KEY (id);
create table public.code_sensei_challenges (
 id uuid default gen_random_uuid() not null,
 topic_id text not null,
 module_number integer not null,
 challenge_type text not null,
 stage text default 'practice'::text,
 question text not null,
 code_snippet text,
 options jsonb,
 correct_answer text not null,
 explanation text,
 difficulty integer default 1,
 display_order integer default 0,
 created_at timestamp with time zone default now()
);
alter table public.code_sensei_challenges enable row level security;
create policy "allow_all" on public.code_sensei_challenges as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_challenges add constraint code_sensei_challenges_pkey PRIMARY KEY (id);
create table public.code_sensei_chat_history (
 id uuid default gen_random_uuid() not null,
 user_id uuid,
 topic_id text not null,
 module_number integer default 0,
 role text not null,
 message text not null,
 created_at timestamp with time zone default now()
);
alter table public.code_sensei_chat_history enable row level security;
create policy "allow_all" on public.code_sensei_chat_history as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_chat_history add constraint code_sensei_chat_history_pkey PRIMARY KEY (id);
create sequence public.code_sensei_course_days_id_seq;
create table public.code_sensei_course_days (
 id integer default nextval('code_sensei_course_days_id_seq'::regclass) not null,
 course_name text not null,
 day_number integer not null,
 title text not null,
 section_ref text,
 created_at timestamp with time zone default now()
);
alter table public.code_sensei_course_days enable row level security;
create policy "allow_all" on public.code_sensei_course_days as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_course_days add constraint code_sensei_course_days_course_name_day_number_key UNIQUE (course_name, day_number);
alter table public.code_sensei_course_days add constraint code_sensei_course_days_pkey PRIMARY KEY (id);
create table public.code_sensei_daily (
 id bigint generated always as identity not null,
 user_id text,
 day text not null,
 lessons_done integer default 0 not null,
 drills_done integer default 0 not null,
 created_at timestamp with time zone default now() not null
);
alter table public.code_sensei_daily enable row level security;
create policy "insert daily" on public.code_sensei_daily as PERMISSIVE for INSERT to public with check(true);
create policy "read daily" on public.code_sensei_daily as PERMISSIVE for SELECT to public using(true);
create policy "update daily" on public.code_sensei_daily as PERMISSIVE for UPDATE to public using(true);
alter table public.code_sensei_daily add constraint code_sensei_daily_day_key UNIQUE (day);
alter table public.code_sensei_daily add constraint code_sensei_daily_pkey PRIMARY KEY (id);
create table public.code_sensei_diff_explanations (
 id uuid default gen_random_uuid() not null,
 revision_from text not null,
 revision_to text not null,
 project_name text not null,
 filename text not null,
 line_number integer,
 change_type text,
 code_old text,
 code_new text,
 explanation text not null,
 group_id text,
 group_label text,
 group_reason text,
 display_order integer default 0,
 created_at timestamp with time zone default now()
);
alter table public.code_sensei_diff_explanations enable row level security;
create policy "allow_all" on public.code_sensei_diff_explanations as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_diff_explanations add constraint code_sensei_diff_explanations_pkey PRIMARY KEY (id);
create table public.code_sensei_ecosystems (
 id uuid default gen_random_uuid() not null,
 revision_from text not null,
 revision_to text not null,
 project_name text not null,
 summary text not null,
 file_tree jsonb not null,
 change_groups jsonb not null,
 created_at timestamp with time zone default now()
);
alter table public.code_sensei_ecosystems enable row level security;
create policy "allow_all" on public.code_sensei_ecosystems as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_ecosystems add constraint code_sensei_ecosystems_pkey PRIMARY KEY (id);
alter table public.code_sensei_ecosystems add constraint code_sensei_ecosystems_revision_from_revision_to_project_na_key UNIQUE (revision_from, revision_to, project_name);
create sequence public.code_sensei_exercises_id_seq;
create table public.code_sensei_exercises (
 id integer default nextval('code_sensei_exercises_id_seq'::regclass) not null,
 user_id uuid not null,
 course_day_id integer,
 title text not null,
 problem_statement text,
 category text,
 source text,
 tags text[],
 status text default 'todo'::text,
 takeaways text,
 created_at timestamp with time zone default now(),
 updated_at timestamp with time zone default now(),
 expected_output text,
 blocks jsonb,
 solution jsonb,
 hints jsonb,
 concept text,
 language text default 'python'::text,
 sort_order integer
);
alter table public.code_sensei_exercises enable row level security;
create policy "allow_all" on public.code_sensei_exercises as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_exercises add constraint code_sensei_exercises_pkey PRIMARY KEY (id);
create table public.code_sensei_lesson_steps (
 id bigint generated always as identity not null,
 topic_id text not null,
 module_number integer not null,
 step_number integer not null,
 title text not null,
 body_md text not null,
 code_snippet text,
 created_at timestamp with time zone default now()
);
alter table public.code_sensei_lesson_steps enable row level security;
create policy "read steps" on public.code_sensei_lesson_steps as PERMISSIVE for SELECT to public using(true);
alter table public.code_sensei_lesson_steps add constraint code_sensei_lesson_steps_pkey PRIMARY KEY (id);
alter table public.code_sensei_lesson_steps add constraint code_sensei_lesson_steps_topic_id_module_number_step_number_key UNIQUE (topic_id, module_number, step_number);
create table public.code_sensei_lessons (
 id uuid default gen_random_uuid() not null,
 topic_id text not null,
 module_number integer default 0,
 module_title text not null,
 explanation_main text,
 explanation_alt text,
 source_files text[],
 display_order integer default 0,
 created_at timestamp with time zone default now(),
 updated_at timestamp with time zone default now()
);
alter table public.code_sensei_lessons enable row level security;
create policy "allow_all" on public.code_sensei_lessons as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_lessons add constraint code_sensei_lessons_pkey PRIMARY KEY (id);
create table public.code_sensei_line_explanations (
 id uuid default gen_random_uuid() not null,
 topic_id text not null,
 module_number integer not null,
 source_filename text not null,
 line_number integer not null,
 explanation text not null,
 concept_tag text,
 created_at timestamp with time zone default now(),
 code_text text
);
alter table public.code_sensei_line_explanations enable row level security;
create policy "allow_all" on public.code_sensei_line_explanations as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_line_explanations add constraint code_sensei_line_explanations_pkey PRIMARY KEY (id);
alter table public.code_sensei_line_explanations add constraint code_sensei_line_explanations_topic_id_source_filename_line_key UNIQUE (topic_id, source_filename, line_number);
create sequence public.code_sensei_mistakes_id_seq;
create table public.code_sensei_mistakes (
 id integer default nextval('code_sensei_mistakes_id_seq'::regclass) not null,
 exercise_id integer not null,
 attempt_id integer,
 language text not null,
 category text,
 title text not null,
 description text,
 code_snippet text,
 correct_form text,
 created_at timestamp with time zone default now()
);
alter table public.code_sensei_mistakes enable row level security;
create policy "allow_all" on public.code_sensei_mistakes as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_mistakes add constraint code_sensei_mistakes_pkey PRIMARY KEY (id);
create sequence public.code_sensei_notebooks_id_seq;
create table public.code_sensei_notebooks (
 id integer default nextval('code_sensei_notebooks_id_seq'::regclass) not null,
 user_id uuid,
 title text not null,
 url text not null,
 category text default 'general'::text,
 description text default ''::text,
 tags text[] default '{}'::text[],
 pinned boolean default false,
 created_at timestamp with time zone default now(),
 updated_at timestamp with time zone default now()
);
alter table public.code_sensei_notebooks enable row level security;
create policy "Allow all on notebooks" on public.code_sensei_notebooks as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_notebooks add constraint code_sensei_notebooks_pkey PRIMARY KEY (id);
create table public.code_sensei_player (
 id bigint generated always as identity not null,
 user_id text,
 xp integer default 0 not null,
 lessons_done integer default 0 not null,
 streak_count integer default 0 not null,
 last_active_day text,
 active_days jsonb default '[]'::jsonb not null,
 hearts integer default 5 not null,
 hearts_day text,
 created_at timestamp with time zone default now() not null
);
alter table public.code_sensei_player enable row level security;
create policy "insert player" on public.code_sensei_player as PERMISSIVE for INSERT to public with check(true);
create policy "read player" on public.code_sensei_player as PERMISSIVE for SELECT to public using(true);
create policy "update player" on public.code_sensei_player as PERMISSIVE for UPDATE to public using(true);
alter table public.code_sensei_player add constraint code_sensei_player_pkey PRIMARY KEY (id);
create table public.code_sensei_progress (
 id uuid default gen_random_uuid() not null,
 user_id uuid,
 roadmap_section text not null,
 topic_id text not null,
 module_number integer default 0,
 status text default 'not_started'::text,
 current_stage text default 'learn'::text,
 quiz_score integer default 0,
 quiz_total integer default 0,
 started_at timestamp with time zone,
 completed_at timestamp with time zone,
 created_at timestamp with time zone default now(),
 updated_at timestamp with time zone default now()
);
alter table public.code_sensei_progress enable row level security;
create policy "allow_all" on public.code_sensei_progress as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_progress add constraint code_sensei_progress_pkey PRIMARY KEY (id);
alter table public.code_sensei_progress add constraint code_sensei_progress_user_id_topic_id_module_number_key UNIQUE (user_id, topic_id, module_number);
create sequence public.code_sensei_py_files_id_seq;
create table public.code_sensei_py_files (
 id integer default nextval('code_sensei_py_files_id_seq'::regclass) not null,
 project_id integer,
 filename text not null,
 code_content text not null,
 file_order integer default 0,
 created_at timestamp with time zone default now()
);
alter table public.code_sensei_py_files enable row level security;
create policy "Allow all on py_files" on public.code_sensei_py_files as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_py_files add constraint code_sensei_py_files_pkey PRIMARY KEY (id);
create sequence public.code_sensei_py_projects_id_seq;
create table public.code_sensei_py_projects (
 id integer default nextval('code_sensei_py_projects_id_seq'::regclass) not null,
 user_id uuid,
 project_name text not null,
 description text default ''::text,
 view_mode text default 'single'::text,
 created_at timestamp with time zone default now(),
 updated_at timestamp with time zone default now()
);
alter table public.code_sensei_py_projects enable row level security;
create policy "Allow all on py_projects" on public.code_sensei_py_projects as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_py_projects add constraint code_sensei_py_projects_pkey PRIMARY KEY (id);
create table public.code_sensei_revision_files (
 id uuid default gen_random_uuid() not null,
 revision_id uuid,
 filename text not null,
 language text not null,
 file_content text not null,
 created_at timestamp with time zone default now()
);
alter table public.code_sensei_revision_files enable row level security;
create policy "allow_all" on public.code_sensei_revision_files as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_revision_files add constraint code_sensei_revision_files_pkey PRIMARY KEY (id);
create table public.code_sensei_revisions (
 id uuid default gen_random_uuid() not null,
 user_id uuid,
 project_name text not null,
 revision_name text not null,
 revision_label text,
 revision_date date,
 display_order integer default 0,
 created_at timestamp with time zone default now()
);
alter table public.code_sensei_revisions enable row level security;
create policy "allow_all" on public.code_sensei_revisions as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_revisions add constraint code_sensei_revisions_pkey PRIMARY KEY (id);
create table public.code_sensei_streaks (
 id uuid default gen_random_uuid() not null,
 user_id uuid,
 study_date date not null,
 minutes_studied integer default 0,
 topics_touched text[],
 modules_completed integer default 0,
 created_at timestamp with time zone default now()
);
alter table public.code_sensei_streaks enable row level security;
create policy "allow_all" on public.code_sensei_streaks as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_streaks add constraint code_sensei_streaks_pkey PRIMARY KEY (id);
alter table public.code_sensei_streaks add constraint code_sensei_streaks_user_id_study_date_key UNIQUE (user_id, study_date);
create table public.code_sensei_user_notes (
 id uuid default gen_random_uuid() not null,
 user_id uuid,
 topic_id text not null,
 module_number integer default 0,
 source_filename text,
 line_number integer,
 note_text text not null,
 note_type text default 'note'::text,
 created_at timestamp with time zone default now()
);
alter table public.code_sensei_user_notes enable row level security;
create policy "allow_all" on public.code_sensei_user_notes as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_user_notes add constraint code_sensei_user_notes_pkey PRIMARY KEY (id);
create table public.code_sensei_users (
 id uuid default gen_random_uuid() not null,
 name text default 'Synthetic learner'::text not null,
 email text,
 preferred_language text default 'en'::text,
 created_at timestamp with time zone default now(),
 updated_at timestamp with time zone default now()
);
alter table public.code_sensei_users enable row level security;
create policy "allow_all" on public.code_sensei_users as PERMISSIVE for ALL to public using(true) with check(true);
alter table public.code_sensei_users add constraint code_sensei_users_pkey PRIMARY KEY (id);
create table public.code_sensei_wrong_answers (
 id bigint generated always as identity not null,
 user_id text,
 challenge_id text not null,
 topic_id text not null,
 module_number text,
 question text not null,
 code_snippet text,
 your_answer text,
 correct_answer text not null,
 source text default 'mcq'::text not null,
 miss_count integer default 1 not null,
 due_at timestamp with time zone default now() not null,
 drill_count integer default 0 not null,
 mastered boolean default false not null,
 created_at timestamp with time zone default now() not null,
 last_missed_at timestamp with time zone default now() not null,
 options jsonb,
 challenge_type text default 'multiple_choice'::text
);
alter table public.code_sensei_wrong_answers enable row level security;
create policy "insert wrong answers" on public.code_sensei_wrong_answers as PERMISSIVE for INSERT to public with check(true);
create policy "read wrong answers" on public.code_sensei_wrong_answers as PERMISSIVE for SELECT to public using(true);
create policy "update wrong answers" on public.code_sensei_wrong_answers as PERMISSIVE for UPDATE to public using(true);
alter table public.code_sensei_wrong_answers add constraint code_sensei_wrong_answers_challenge_id_key UNIQUE (challenge_id);
alter table public.code_sensei_wrong_answers add constraint code_sensei_wrong_answers_pkey PRIMARY KEY (id);
alter table public.code_sensei_attempts add constraint code_sensei_attempts_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES code_sensei_exercises(id) ON DELETE CASCADE;
alter table public.code_sensei_chat_history add constraint code_sensei_chat_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES code_sensei_users(id) ON DELETE CASCADE;
alter table public.code_sensei_exercises add constraint code_sensei_exercises_course_day_id_fkey FOREIGN KEY (course_day_id) REFERENCES code_sensei_course_days(id) ON DELETE SET NULL;
alter table public.code_sensei_exercises add constraint code_sensei_exercises_user_id_fkey FOREIGN KEY (user_id) REFERENCES code_sensei_users(id) ON DELETE CASCADE;
alter table public.code_sensei_mistakes add constraint code_sensei_mistakes_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES code_sensei_attempts(id) ON DELETE SET NULL;
alter table public.code_sensei_mistakes add constraint code_sensei_mistakes_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES code_sensei_exercises(id) ON DELETE CASCADE;
alter table public.code_sensei_notebooks add constraint code_sensei_notebooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES code_sensei_users(id);
alter table public.code_sensei_progress add constraint code_sensei_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES code_sensei_users(id) ON DELETE CASCADE;
alter table public.code_sensei_py_files add constraint code_sensei_py_files_project_id_fkey FOREIGN KEY (project_id) REFERENCES code_sensei_py_projects(id) ON DELETE CASCADE;
alter table public.code_sensei_py_projects add constraint code_sensei_py_projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES code_sensei_users(id);
alter table public.code_sensei_revision_files add constraint code_sensei_revision_files_revision_id_fkey FOREIGN KEY (revision_id) REFERENCES code_sensei_revisions(id) ON DELETE CASCADE;
alter table public.code_sensei_revisions add constraint code_sensei_revisions_user_id_fkey FOREIGN KEY (user_id) REFERENCES code_sensei_users(id) ON DELETE CASCADE;
alter table public.code_sensei_streaks add constraint code_sensei_streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES code_sensei_users(id) ON DELETE CASCADE;
alter table public.code_sensei_user_notes add constraint code_sensei_user_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES code_sensei_users(id) ON DELETE CASCADE;
grant usage,select on all sequences in schema public to anon,authenticated;

alter sequence public.code_sensei_attempts_id_seq owned by public.code_sensei_attempts.id;
alter sequence public.code_sensei_course_days_id_seq owned by public.code_sensei_course_days.id;
alter sequence public.code_sensei_exercises_id_seq owned by public.code_sensei_exercises.id;
alter sequence public.code_sensei_mistakes_id_seq owned by public.code_sensei_mistakes.id;
alter sequence public.code_sensei_notebooks_id_seq owned by public.code_sensei_notebooks.id;
alter sequence public.code_sensei_py_files_id_seq owned by public.code_sensei_py_files.id;
alter sequence public.code_sensei_py_projects_id_seq owned by public.code_sensei_py_projects.id;
grant all on public.code_sensei_attempts to anon,authenticated,service_role;
grant all on public.code_sensei_challenges to anon,authenticated,service_role;
grant all on public.code_sensei_chat_history to anon,authenticated,service_role;
grant all on public.code_sensei_course_days to anon,authenticated,service_role;
grant all on public.code_sensei_daily to anon,authenticated,service_role;
grant all on public.code_sensei_diff_explanations to anon,authenticated,service_role;
grant all on public.code_sensei_ecosystems to anon,authenticated,service_role;
grant all on public.code_sensei_exercises to anon,authenticated,service_role;
grant all on public.code_sensei_lesson_steps to anon,authenticated,service_role;
grant all on public.code_sensei_lessons to anon,authenticated,service_role;
grant all on public.code_sensei_line_explanations to anon,authenticated,service_role;
grant all on public.code_sensei_mistakes to anon,authenticated,service_role;
grant all on public.code_sensei_notebooks to anon,authenticated,service_role;
grant all on public.code_sensei_player to anon,authenticated,service_role;
grant all on public.code_sensei_progress to anon,authenticated,service_role;
grant all on public.code_sensei_py_files to anon,authenticated,service_role;
grant all on public.code_sensei_py_projects to anon,authenticated,service_role;
grant all on public.code_sensei_revision_files to anon,authenticated,service_role;
grant all on public.code_sensei_revisions to anon,authenticated,service_role;
grant all on public.code_sensei_streaks to anon,authenticated,service_role;
grant all on public.code_sensei_user_notes to anon,authenticated,service_role;
grant all on public.code_sensei_users to anon,authenticated,service_role;
grant all on public.code_sensei_wrong_answers to anon,authenticated,service_role;
