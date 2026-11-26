-- REVIEW CANDIDATE ONLY. Unapplied; not a seventh Commonplace migration.
-- Requires 01 + 02, verified mappings, reviewed Code_sensei client cutover and recovery.
-- All checks and changes are atomic. No ownership is inferred or backfilled.
begin;
set local search_path=pg_catalog,public;
lock table ga_private.owner_links,ga_private.client_cutovers in share mode;
lock table public.code_sensei_attempts,
 public.code_sensei_challenges,
 public.code_sensei_chat_history,
 public.code_sensei_course_days,
 public.code_sensei_daily,
 public.code_sensei_diff_explanations,
 public.code_sensei_ecosystems,
 public.code_sensei_exercises,
 public.code_sensei_lesson_steps,
 public.code_sensei_lessons,
 public.code_sensei_line_explanations,
 public.code_sensei_mistakes,
 public.code_sensei_notebooks,
 public.code_sensei_player,
 public.code_sensei_progress,
 public.code_sensei_py_files,
 public.code_sensei_py_projects,
 public.code_sensei_revision_files,
 public.code_sensei_revisions,
 public.code_sensei_streaks,
 public.code_sensei_user_notes,
 public.code_sensei_users,
 public.code_sensei_wrong_answers in access exclusive mode;
create temp table cs_reviewed(table_name text primary key, shape text, policies jsonb) on commit drop;
insert into cs_reviewed values
 ('code_sensei_attempts','id:integer|exercise_id:integer|attempt_number:integer|code:text|mistake_log:text|result:text|notes:text|created_at:timestamp with time zone','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_challenges','id:uuid|topic_id:text|module_number:integer|challenge_type:text|stage:text|question:text|code_snippet:text|options:jsonb|correct_answer:text|explanation:text|difficulty:integer|display_order:integer|created_at:timestamp with time zone','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_chat_history','id:uuid|user_id:uuid|topic_id:text|module_number:integer|role:text|message:text|created_at:timestamp with time zone','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_course_days','id:integer|course_name:text|day_number:integer|title:text|section_ref:text|created_at:timestamp with time zone','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_daily','id:bigint|user_id:text|day:text|lessons_done:integer|drills_done:integer|created_at:timestamp with time zone','[{"policyname":"insert daily","permissive":"PERMISSIVE","roles":["public"],"cmd":"INSERT","qual":null,"with_check":"true"},{"policyname":"read daily","permissive":"PERMISSIVE","roles":["public"],"cmd":"SELECT","qual":"true","with_check":null},{"policyname":"update daily","permissive":"PERMISSIVE","roles":["public"],"cmd":"UPDATE","qual":"true","with_check":null}]'::jsonb),
 ('code_sensei_diff_explanations','id:uuid|revision_from:text|revision_to:text|project_name:text|filename:text|line_number:integer|change_type:text|code_old:text|code_new:text|explanation:text|group_id:text|group_label:text|group_reason:text|display_order:integer|created_at:timestamp with time zone','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_ecosystems','id:uuid|revision_from:text|revision_to:text|project_name:text|summary:text|file_tree:jsonb|change_groups:jsonb|created_at:timestamp with time zone','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_exercises','id:integer|user_id:uuid|course_day_id:integer|title:text|problem_statement:text|category:text|source:text|tags:text[]|status:text|takeaways:text|created_at:timestamp with time zone|updated_at:timestamp with time zone|expected_output:text|blocks:jsonb|solution:jsonb|hints:jsonb|concept:text|language:text|sort_order:integer','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_lesson_steps','id:bigint|topic_id:text|module_number:integer|step_number:integer|title:text|body_md:text|code_snippet:text|created_at:timestamp with time zone','[{"policyname":"read steps","permissive":"PERMISSIVE","roles":["public"],"cmd":"SELECT","qual":"true","with_check":null}]'::jsonb),
 ('code_sensei_lessons','id:uuid|topic_id:text|module_number:integer|module_title:text|explanation_main:text|explanation_alt:text|source_files:text[]|display_order:integer|created_at:timestamp with time zone|updated_at:timestamp with time zone','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_line_explanations','id:uuid|topic_id:text|module_number:integer|source_filename:text|line_number:integer|explanation:text|concept_tag:text|created_at:timestamp with time zone|code_text:text','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_mistakes','id:integer|exercise_id:integer|attempt_id:integer|language:text|category:text|title:text|description:text|code_snippet:text|correct_form:text|created_at:timestamp with time zone','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_notebooks','id:integer|user_id:uuid|title:text|url:text|category:text|description:text|tags:text[]|pinned:boolean|created_at:timestamp with time zone|updated_at:timestamp with time zone','[{"policyname":"Allow all on notebooks","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_player','id:bigint|user_id:text|xp:integer|lessons_done:integer|streak_count:integer|last_active_day:text|active_days:jsonb|hearts:integer|hearts_day:text|created_at:timestamp with time zone','[{"policyname":"insert player","permissive":"PERMISSIVE","roles":["public"],"cmd":"INSERT","qual":null,"with_check":"true"},{"policyname":"read player","permissive":"PERMISSIVE","roles":["public"],"cmd":"SELECT","qual":"true","with_check":null},{"policyname":"update player","permissive":"PERMISSIVE","roles":["public"],"cmd":"UPDATE","qual":"true","with_check":null}]'::jsonb),
 ('code_sensei_progress','id:uuid|user_id:uuid|roadmap_section:text|topic_id:text|module_number:integer|status:text|current_stage:text|quiz_score:integer|quiz_total:integer|started_at:timestamp with time zone|completed_at:timestamp with time zone|created_at:timestamp with time zone|updated_at:timestamp with time zone','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_py_files','id:integer|project_id:integer|filename:text|code_content:text|file_order:integer|created_at:timestamp with time zone','[{"policyname":"Allow all on py_files","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_py_projects','id:integer|user_id:uuid|project_name:text|description:text|view_mode:text|created_at:timestamp with time zone|updated_at:timestamp with time zone','[{"policyname":"Allow all on py_projects","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_revision_files','id:uuid|revision_id:uuid|filename:text|language:text|file_content:text|created_at:timestamp with time zone','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_revisions','id:uuid|user_id:uuid|project_name:text|revision_name:text|revision_label:text|revision_date:date|display_order:integer|created_at:timestamp with time zone','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_streaks','id:uuid|user_id:uuid|study_date:date|minutes_studied:integer|topics_touched:text[]|modules_completed:integer|created_at:timestamp with time zone','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_user_notes','id:uuid|user_id:uuid|topic_id:text|module_number:integer|source_filename:text|line_number:integer|note_text:text|note_type:text|created_at:timestamp with time zone','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_users','id:uuid|name:text|email:text|preferred_language:text|created_at:timestamp with time zone|updated_at:timestamp with time zone','[{"policyname":"allow_all","permissive":"PERMISSIVE","roles":["public"],"cmd":"ALL","qual":"true","with_check":"true"}]'::jsonb),
 ('code_sensei_wrong_answers','id:bigint|user_id:text|challenge_id:text|topic_id:text|module_number:text|question:text|code_snippet:text|your_answer:text|correct_answer:text|source:text|miss_count:integer|due_at:timestamp with time zone|drill_count:integer|mastered:boolean|created_at:timestamp with time zone|last_missed_at:timestamp with time zone|options:jsonb|challenge_type:text','[{"policyname":"insert wrong answers","permissive":"PERMISSIVE","roles":["public"],"cmd":"INSERT","qual":null,"with_check":"true"},{"policyname":"read wrong answers","permissive":"PERMISSIVE","roles":["public"],"cmd":"SELECT","qual":"true","with_check":null},{"policyname":"update wrong answers","permissive":"PERMISSIVE","roles":["public"],"cmd":"UPDATE","qual":"true","with_check":null}]'::jsonb);
do $preflight$
declare t record; actual jsonb; relation regclass;
begin
 if not exists(select from pg_proc where oid=to_regprocedure('public.code_sensei_current_user_id()')
   and prosecdef and provolatile='s' and proconfig=array['search_path=""']
   and pg_get_userbyid(proowner)='postgres' and md5(replace(prosrc,E'\r\n',E'\n'))='703ba76860a81e29680b0ab235d0a04c')
 then raise exception 'review Code_sensei identity RPC drift'; end if;
 if exists(select from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname like 'code_sensei_%' and c.relkind in ('r','v','m','p')
    and not exists(select from cs_reviewed where table_name=c.relname))
 then raise exception 'review additional Code_sensei relations'; end if;
 if exists(select from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.oid<>to_regprocedure('public.code_sensei_current_user_id()')
    and (p.proname like 'code_sensei_%' or p.prosrc ~* 'code_sensei_'))
 then raise exception 'review Code_sensei routine dependencies'; end if;
 if (select jsonb_agg(jsonb_build_object('table',r.table_name,'name',c.conname,'definition',pg_get_constraintdef(c.oid),'validated',c.convalidated) order by r.table_name,c.conname)
   from cs_reviewed r join pg_constraint c on c.conrelid=('public.'||r.table_name)::regclass)
   is distinct from '[{"table":"code_sensei_attempts","name":"code_sensei_attempts_exercise_id_fkey","definition":"FOREIGN KEY (exercise_id) REFERENCES code_sensei_exercises(id) ON DELETE CASCADE","validated":true},{"table":"code_sensei_attempts","name":"code_sensei_attempts_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_challenges","name":"code_sensei_challenges_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_chat_history","name":"code_sensei_chat_history_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_chat_history","name":"code_sensei_chat_history_user_id_fkey","definition":"FOREIGN KEY (user_id) REFERENCES code_sensei_users(id) ON DELETE CASCADE","validated":true},{"table":"code_sensei_course_days","name":"code_sensei_course_days_course_name_day_number_key","definition":"UNIQUE (course_name, day_number)","validated":true},{"table":"code_sensei_course_days","name":"code_sensei_course_days_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_daily","name":"code_sensei_daily_day_key","definition":"UNIQUE (day)","validated":true},{"table":"code_sensei_daily","name":"code_sensei_daily_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_diff_explanations","name":"code_sensei_diff_explanations_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_ecosystems","name":"code_sensei_ecosystems_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_ecosystems","name":"code_sensei_ecosystems_revision_from_revision_to_project_na_key","definition":"UNIQUE (revision_from, revision_to, project_name)","validated":true},{"table":"code_sensei_exercises","name":"code_sensei_exercises_course_day_id_fkey","definition":"FOREIGN KEY (course_day_id) REFERENCES code_sensei_course_days(id) ON DELETE SET NULL","validated":true},{"table":"code_sensei_exercises","name":"code_sensei_exercises_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_exercises","name":"code_sensei_exercises_user_id_fkey","definition":"FOREIGN KEY (user_id) REFERENCES code_sensei_users(id) ON DELETE CASCADE","validated":true},{"table":"code_sensei_lesson_steps","name":"code_sensei_lesson_steps_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_lesson_steps","name":"code_sensei_lesson_steps_topic_id_module_number_step_number_key","definition":"UNIQUE (topic_id, module_number, step_number)","validated":true},{"table":"code_sensei_lessons","name":"code_sensei_lessons_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_line_explanations","name":"code_sensei_line_explanations_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_line_explanations","name":"code_sensei_line_explanations_topic_id_source_filename_line_key","definition":"UNIQUE (topic_id, source_filename, line_number)","validated":true},{"table":"code_sensei_mistakes","name":"code_sensei_mistakes_attempt_id_fkey","definition":"FOREIGN KEY (attempt_id) REFERENCES code_sensei_attempts(id) ON DELETE SET NULL","validated":true},{"table":"code_sensei_mistakes","name":"code_sensei_mistakes_exercise_id_fkey","definition":"FOREIGN KEY (exercise_id) REFERENCES code_sensei_exercises(id) ON DELETE CASCADE","validated":true},{"table":"code_sensei_mistakes","name":"code_sensei_mistakes_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_notebooks","name":"code_sensei_notebooks_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_notebooks","name":"code_sensei_notebooks_user_id_fkey","definition":"FOREIGN KEY (user_id) REFERENCES code_sensei_users(id)","validated":true},{"table":"code_sensei_player","name":"code_sensei_player_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_progress","name":"code_sensei_progress_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_progress","name":"code_sensei_progress_user_id_fkey","definition":"FOREIGN KEY (user_id) REFERENCES code_sensei_users(id) ON DELETE CASCADE","validated":true},{"table":"code_sensei_progress","name":"code_sensei_progress_user_id_topic_id_module_number_key","definition":"UNIQUE (user_id, topic_id, module_number)","validated":true},{"table":"code_sensei_py_files","name":"code_sensei_py_files_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_py_files","name":"code_sensei_py_files_project_id_fkey","definition":"FOREIGN KEY (project_id) REFERENCES code_sensei_py_projects(id) ON DELETE CASCADE","validated":true},{"table":"code_sensei_py_projects","name":"code_sensei_py_projects_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_py_projects","name":"code_sensei_py_projects_user_id_fkey","definition":"FOREIGN KEY (user_id) REFERENCES code_sensei_users(id)","validated":true},{"table":"code_sensei_revision_files","name":"code_sensei_revision_files_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_revision_files","name":"code_sensei_revision_files_revision_id_fkey","definition":"FOREIGN KEY (revision_id) REFERENCES code_sensei_revisions(id) ON DELETE CASCADE","validated":true},{"table":"code_sensei_revisions","name":"code_sensei_revisions_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_revisions","name":"code_sensei_revisions_user_id_fkey","definition":"FOREIGN KEY (user_id) REFERENCES code_sensei_users(id) ON DELETE CASCADE","validated":true},{"table":"code_sensei_streaks","name":"code_sensei_streaks_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_streaks","name":"code_sensei_streaks_user_id_fkey","definition":"FOREIGN KEY (user_id) REFERENCES code_sensei_users(id) ON DELETE CASCADE","validated":true},{"table":"code_sensei_streaks","name":"code_sensei_streaks_user_id_study_date_key","definition":"UNIQUE (user_id, study_date)","validated":true},{"table":"code_sensei_user_notes","name":"code_sensei_user_notes_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_user_notes","name":"code_sensei_user_notes_user_id_fkey","definition":"FOREIGN KEY (user_id) REFERENCES code_sensei_users(id) ON DELETE CASCADE","validated":true},{"table":"code_sensei_users","name":"code_sensei_users_pkey","definition":"PRIMARY KEY (id)","validated":true},{"table":"code_sensei_wrong_answers","name":"code_sensei_wrong_answers_challenge_id_key","definition":"UNIQUE (challenge_id)","validated":true},{"table":"code_sensei_wrong_answers","name":"code_sensei_wrong_answers_pkey","definition":"PRIMARY KEY (id)","validated":true}]'::jsonb
 then raise exception 'review Code_sensei constraint drift'; end if;
 if exists(select from pg_constraint c where c.contype='f'
   and c.confrelid in (select ('public.'||table_name)::regclass from cs_reviewed)
   and c.conrelid not in (select ('public.'||table_name)::regclass from cs_reviewed)
   and not (c.conrelid='ga_private.owner_links'::regclass and
    pg_get_constraintdef(c.oid)='FOREIGN KEY (code_user_id) REFERENCES code_sensei_users(id) ON DELETE RESTRICT'))
 then raise exception 'review external Code_sensei relationships'; end if;
 if not exists(select from ga_private.client_cutovers where app='code-sensei' and verified_at<=now())
 then raise exception 'Code_sensei client cutover evidence required'; end if;
 if exists(select from public.code_sensei_users s where not exists(
   select from ga_private.owner_links l join auth.users u on u.id=l.auth_user_id
   where l.app='code-sensei' and l.code_user_id=s.id and u.email_confirmed_at is not null and u.is_anonymous is false))
 then raise exception 'verified Code_sensei mappings required; no records changed'; end if;
 if exists(select from pg_trigger tr where not tr.tgisinternal and tr.tgrelid in
   (select ('public.'||table_name)::regclass from cs_reviewed))
 then raise exception 'review Code_sensei trigger drift'; end if;
 if exists(select from pg_views where schemaname='public' and definition ~* 'code_sensei_')
 then raise exception 'review Code_sensei view dependencies'; end if;
 for t in select * from cs_reviewed loop
  relation:=('public.'||t.table_name)::regclass;
  if not exists(select from pg_class where oid=relation and relkind='r' and relrowsecurity)
   or (select string_agg(attname||':'||format_type(atttypid,atttypmod),'|' order by attnum)
       from pg_attribute where attrelid=relation and attnum>0 and not attisdropped)<>t.shape
  then raise exception 'review Code_sensei schema drift on %',relation; end if;
  select jsonb_agg(jsonb_build_object('policyname',policyname,'permissive',permissive,'roles',roles,
   'cmd',cmd,'qual',qual,'with_check',with_check) order by policyname) into actual from pg_policies
   where schemaname='public' and tablename=t.table_name and policyname not in('ga_owner_guard','ga_authenticated_guard');
  if actual is distinct from t.policies then raise exception 'review Code_sensei policy drift on %',relation; end if;
  if t.table_name in ('code_sensei_users','code_sensei_user_notes','code_sensei_progress') then
   if (select count(*) from pg_policies where schemaname='public' and tablename=t.table_name
    and policyname in ('ga_owner_guard','ga_authenticated_guard') and permissive='RESTRICTIVE')<>2
   then raise exception 'candidate 02 Code_sensei guards required'; end if;
  elsif exists(select from pg_policies where schemaname='public' and tablename=t.table_name
    and policyname in ('ga_owner_guard','ga_authenticated_guard')) then
   raise exception 'unexpected prior guards on %',relation;
  end if;
 end loop;
end; $preflight$;
do $$ begin
 if exists(select from public.code_sensei_chat_history d where not exists(select from public.code_sensei_users u where u.id::text=d.user_id::text))
 then raise exception 'review missing owner in code_sensei_chat_history; no records changed'; end if;
end; $$;
do $$ begin
 if exists(select from public.code_sensei_daily d where not exists(select from public.code_sensei_users u where u.id::text=d.user_id::text))
 then raise exception 'review missing owner in code_sensei_daily; no records changed'; end if;
end; $$;
do $$ begin
 if exists(select from public.code_sensei_exercises d where not exists(select from public.code_sensei_users u where u.id::text=d.user_id::text))
 then raise exception 'review missing owner in code_sensei_exercises; no records changed'; end if;
end; $$;
do $$ begin
 if exists(select from public.code_sensei_notebooks d where not exists(select from public.code_sensei_users u where u.id::text=d.user_id::text))
 then raise exception 'review missing owner in code_sensei_notebooks; no records changed'; end if;
end; $$;
do $$ begin
 if exists(select from public.code_sensei_player d where not exists(select from public.code_sensei_users u where u.id::text=d.user_id::text))
 then raise exception 'review missing owner in code_sensei_player; no records changed'; end if;
end; $$;
do $$ begin
 if exists(select from public.code_sensei_progress d where not exists(select from public.code_sensei_users u where u.id::text=d.user_id::text))
 then raise exception 'review missing owner in code_sensei_progress; no records changed'; end if;
end; $$;
do $$ begin
 if exists(select from public.code_sensei_py_projects d where not exists(select from public.code_sensei_users u where u.id::text=d.user_id::text))
 then raise exception 'review missing owner in code_sensei_py_projects; no records changed'; end if;
end; $$;
do $$ begin
 if exists(select from public.code_sensei_revisions d where not exists(select from public.code_sensei_users u where u.id::text=d.user_id::text))
 then raise exception 'review missing owner in code_sensei_revisions; no records changed'; end if;
end; $$;
do $$ begin
 if exists(select from public.code_sensei_streaks d where not exists(select from public.code_sensei_users u where u.id::text=d.user_id::text))
 then raise exception 'review missing owner in code_sensei_streaks; no records changed'; end if;
end; $$;
do $$ begin
 if exists(select from public.code_sensei_user_notes d where not exists(select from public.code_sensei_users u where u.id::text=d.user_id::text))
 then raise exception 'review missing owner in code_sensei_user_notes; no records changed'; end if;
end; $$;
do $$ begin
 if exists(select from public.code_sensei_wrong_answers d where not exists(select from public.code_sensei_users u where u.id::text=d.user_id::text))
 then raise exception 'review missing owner in code_sensei_wrong_answers; no records changed'; end if;
end; $$;
do $$ begin
 if exists(select from public.code_sensei_attempts d where not exists(select from public.code_sensei_exercises p where p.id=d.exercise_id))
 then raise exception 'review orphan in code_sensei_attempts; no records changed'; end if;
end; $$;
do $$ begin
 if exists(select from public.code_sensei_mistakes d where not exists(select from public.code_sensei_exercises p where p.id=d.exercise_id))
 then raise exception 'review orphan in code_sensei_mistakes; no records changed'; end if;
end; $$;
do $$ begin
 if exists(select from public.code_sensei_py_files d where not exists(select from public.code_sensei_py_projects p where p.id=d.project_id))
 then raise exception 'review orphan in code_sensei_py_files; no records changed'; end if;
end; $$;
do $$ begin
 if exists(select from public.code_sensei_revision_files d where not exists(select from public.code_sensei_revisions p where p.id=d.revision_id))
 then raise exception 'review orphan in code_sensei_revision_files; no records changed'; end if;
end; $$;
do $$ begin
 if exists(select from public.code_sensei_mistakes m join public.code_sensei_attempts a on a.id=m.attempt_id where a.exercise_id<>m.exercise_id)
 then raise exception 'review conflicting mistake/attempt owners'; end if;
 if exists(select from public.code_sensei_player group by user_id having count(*)>1)
 then raise exception 'review duplicate player records'; end if;
end; $$;

-- A new Commonplace account is not automatically a Code_sensei member.
create function ga_private.code_sensei_identity() returns uuid
language sql stable security definer set search_path='' as $$
 select l.code_user_id from ga_private.owner_links l join auth.users u on u.id=l.auth_user_id
 where l.app='code-sensei' and l.auth_user_id=(select auth.uid())
  and u.email_confirmed_at is not null and u.is_anonymous is false
  and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false';
$$;
create function ga_private.code_sensei_editor() returns boolean
language sql stable security definer set search_path='' as $$
 select ga_private.code_sensei_identity() is not null and
  (select count(*)=1 and bool_and(role in ('admin','operator'))
   from public.authentication_mode_user_roles where auth_user_id=(select auth.uid()));
$$;
revoke all on function ga_private.code_sensei_identity(),ga_private.code_sensei_editor()
 from public,anon,authenticated,service_role;
grant execute on function ga_private.code_sensei_identity(),ga_private.code_sensei_editor() to authenticated;
-- Fixed-signature caller-only RPC. A missing/revoked mapping fails closed.
create or replace function public.code_sensei_current_user_id() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare result uuid;
begin
 result:=ga_private.code_sensei_identity();
 if result is null then raise exception 'one verified legacy identity required' using errcode='42501'; end if;
 return result;
end; $$;
revoke all on function public.code_sensei_current_user_id() from public,anon,authenticated,service_role;
grant execute on function public.code_sensei_current_user_id() to authenticated;

-- Preserve legacy IDs and payloads; prohibit changing the owner in place.
create function ga_private.code_sensei_keep_owner() returns trigger language plpgsql set search_path='' as $$
begin
 if new.user_id is distinct from old.user_id then
  raise exception 'Code_sensei owner cannot be reassigned' using errcode='42501';
 end if;
 return new;
end; $$;
revoke all on function ga_private.code_sensei_keep_owner() from public,anon,authenticated,service_role;
select ga_private.set_browser_access('public.code_sensei_attempts',true);
create policy cs_identity_guard on public.code_sensei_attempts as restrictive for all to public
 using (exists(select from public.code_sensei_exercises p where p.id=code_sensei_attempts.exercise_id and p.user_id::text=(select ga_private.code_sensei_identity())::text)) with check (exists(select from public.code_sensei_exercises p where p.id=code_sensei_attempts.exercise_id and p.user_id::text=(select ga_private.code_sensei_identity())::text));
alter table public.code_sensei_attempts alter column exercise_id set not null;
select ga_private.set_browser_access('public.code_sensei_challenges',false);
create policy cs_identity_guard on public.code_sensei_challenges as restrictive for all to public
 using ((select ga_private.code_sensei_identity()) is not null) with check ((select ga_private.code_sensei_identity()) is not null);
create policy cs_shared_write_guard on public.code_sensei_challenges as restrictive for all to authenticated
 using (true) with check ((select ga_private.code_sensei_editor()));
select ga_private.set_browser_access('public.code_sensei_chat_history',true);
create policy cs_identity_guard on public.code_sensei_chat_history as restrictive for all to public
 using (user_id::text=(select ga_private.code_sensei_identity())::text) with check (user_id::text=(select ga_private.code_sensei_identity())::text);
alter table public.code_sensei_chat_history alter column user_id set not null;
create trigger cs_keep_owner before update on public.code_sensei_chat_history
 for each row execute function ga_private.code_sensei_keep_owner();
select ga_private.set_browser_access('public.code_sensei_course_days',false);
create policy cs_identity_guard on public.code_sensei_course_days as restrictive for all to public
 using ((select ga_private.code_sensei_identity()) is not null) with check ((select ga_private.code_sensei_identity()) is not null);
create policy cs_shared_write_guard on public.code_sensei_course_days as restrictive for all to authenticated
 using (true) with check ((select ga_private.code_sensei_editor()));
select ga_private.set_browser_access('public.code_sensei_daily',true);
create policy cs_identity_guard on public.code_sensei_daily as restrictive for all to public
 using (user_id::text=(select ga_private.code_sensei_identity())::text) with check (user_id::text=(select ga_private.code_sensei_identity())::text);
alter table public.code_sensei_daily alter column user_id set not null;
create trigger cs_keep_owner before update on public.code_sensei_daily
 for each row execute function ga_private.code_sensei_keep_owner();
select ga_private.set_browser_access('public.code_sensei_diff_explanations',false);
create policy cs_identity_guard on public.code_sensei_diff_explanations as restrictive for all to public
 using ((select ga_private.code_sensei_identity()) is not null) with check ((select ga_private.code_sensei_identity()) is not null);
create policy cs_shared_write_guard on public.code_sensei_diff_explanations as restrictive for all to authenticated
 using (true) with check ((select ga_private.code_sensei_editor()));
select ga_private.set_browser_access('public.code_sensei_ecosystems',false);
create policy cs_identity_guard on public.code_sensei_ecosystems as restrictive for all to public
 using ((select ga_private.code_sensei_identity()) is not null) with check ((select ga_private.code_sensei_identity()) is not null);
create policy cs_shared_write_guard on public.code_sensei_ecosystems as restrictive for all to authenticated
 using (true) with check ((select ga_private.code_sensei_editor()));
select ga_private.set_browser_access('public.code_sensei_exercises',true);
create policy cs_identity_guard on public.code_sensei_exercises as restrictive for all to public
 using (user_id::text=(select ga_private.code_sensei_identity())::text) with check (user_id::text=(select ga_private.code_sensei_identity())::text);
alter table public.code_sensei_exercises alter column user_id set not null;
create trigger cs_keep_owner before update on public.code_sensei_exercises
 for each row execute function ga_private.code_sensei_keep_owner();
select ga_private.set_browser_access('public.code_sensei_lesson_steps',false);
create policy cs_identity_guard on public.code_sensei_lesson_steps as restrictive for all to public
 using ((select ga_private.code_sensei_identity()) is not null) with check ((select ga_private.code_sensei_identity()) is not null);
create policy cs_shared_write_guard on public.code_sensei_lesson_steps as restrictive for all to authenticated
 using (true) with check ((select ga_private.code_sensei_editor()));
select ga_private.set_browser_access('public.code_sensei_lessons',false);
create policy cs_identity_guard on public.code_sensei_lessons as restrictive for all to public
 using ((select ga_private.code_sensei_identity()) is not null) with check ((select ga_private.code_sensei_identity()) is not null);
create policy cs_shared_write_guard on public.code_sensei_lessons as restrictive for all to authenticated
 using (true) with check ((select ga_private.code_sensei_editor()));
select ga_private.set_browser_access('public.code_sensei_line_explanations',false);
create policy cs_identity_guard on public.code_sensei_line_explanations as restrictive for all to public
 using ((select ga_private.code_sensei_identity()) is not null) with check ((select ga_private.code_sensei_identity()) is not null);
create policy cs_shared_write_guard on public.code_sensei_line_explanations as restrictive for all to authenticated
 using (true) with check ((select ga_private.code_sensei_editor()));
select ga_private.set_browser_access('public.code_sensei_mistakes',true);
create policy cs_identity_guard on public.code_sensei_mistakes as restrictive for all to public
 using (exists(select from public.code_sensei_exercises p where p.id=code_sensei_mistakes.exercise_id and p.user_id::text=(select ga_private.code_sensei_identity())::text)) with check (exists(select from public.code_sensei_exercises p where p.id=code_sensei_mistakes.exercise_id and p.user_id::text=(select ga_private.code_sensei_identity())::text));
alter table public.code_sensei_mistakes alter column exercise_id set not null;
select ga_private.set_browser_access('public.code_sensei_notebooks',true);
create policy cs_identity_guard on public.code_sensei_notebooks as restrictive for all to public
 using (user_id::text=(select ga_private.code_sensei_identity())::text) with check (user_id::text=(select ga_private.code_sensei_identity())::text);
alter table public.code_sensei_notebooks alter column user_id set not null;
create trigger cs_keep_owner before update on public.code_sensei_notebooks
 for each row execute function ga_private.code_sensei_keep_owner();
select ga_private.set_browser_access('public.code_sensei_player',true);
create policy cs_identity_guard on public.code_sensei_player as restrictive for all to public
 using (user_id::text=(select ga_private.code_sensei_identity())::text) with check (user_id::text=(select ga_private.code_sensei_identity())::text);
alter table public.code_sensei_player alter column user_id set not null;
create trigger cs_keep_owner before update on public.code_sensei_player
 for each row execute function ga_private.code_sensei_keep_owner();
select ga_private.set_browser_access('public.code_sensei_progress',true);
create policy cs_identity_guard on public.code_sensei_progress as restrictive for all to public
 using (user_id::text=(select ga_private.code_sensei_identity())::text) with check (user_id::text=(select ga_private.code_sensei_identity())::text);
alter table public.code_sensei_progress alter column user_id set not null;
create trigger cs_keep_owner before update on public.code_sensei_progress
 for each row execute function ga_private.code_sensei_keep_owner();
select ga_private.set_browser_access('public.code_sensei_py_files',true);
create policy cs_identity_guard on public.code_sensei_py_files as restrictive for all to public
 using (exists(select from public.code_sensei_py_projects p where p.id=code_sensei_py_files.project_id and p.user_id::text=(select ga_private.code_sensei_identity())::text)) with check (exists(select from public.code_sensei_py_projects p where p.id=code_sensei_py_files.project_id and p.user_id::text=(select ga_private.code_sensei_identity())::text));
alter table public.code_sensei_py_files alter column project_id set not null;
select ga_private.set_browser_access('public.code_sensei_py_projects',true);
create policy cs_identity_guard on public.code_sensei_py_projects as restrictive for all to public
 using (user_id::text=(select ga_private.code_sensei_identity())::text) with check (user_id::text=(select ga_private.code_sensei_identity())::text);
alter table public.code_sensei_py_projects alter column user_id set not null;
create trigger cs_keep_owner before update on public.code_sensei_py_projects
 for each row execute function ga_private.code_sensei_keep_owner();
select ga_private.set_browser_access('public.code_sensei_revision_files',true);
create policy cs_identity_guard on public.code_sensei_revision_files as restrictive for all to public
 using (exists(select from public.code_sensei_revisions p where p.id=code_sensei_revision_files.revision_id and p.user_id::text=(select ga_private.code_sensei_identity())::text)) with check (exists(select from public.code_sensei_revisions p where p.id=code_sensei_revision_files.revision_id and p.user_id::text=(select ga_private.code_sensei_identity())::text));
alter table public.code_sensei_revision_files alter column revision_id set not null;
select ga_private.set_browser_access('public.code_sensei_revisions',true);
create policy cs_identity_guard on public.code_sensei_revisions as restrictive for all to public
 using (user_id::text=(select ga_private.code_sensei_identity())::text) with check (user_id::text=(select ga_private.code_sensei_identity())::text);
alter table public.code_sensei_revisions alter column user_id set not null;
create trigger cs_keep_owner before update on public.code_sensei_revisions
 for each row execute function ga_private.code_sensei_keep_owner();
select ga_private.set_browser_access('public.code_sensei_streaks',true);
create policy cs_identity_guard on public.code_sensei_streaks as restrictive for all to public
 using (user_id::text=(select ga_private.code_sensei_identity())::text) with check (user_id::text=(select ga_private.code_sensei_identity())::text);
alter table public.code_sensei_streaks alter column user_id set not null;
create trigger cs_keep_owner before update on public.code_sensei_streaks
 for each row execute function ga_private.code_sensei_keep_owner();
select ga_private.set_browser_access('public.code_sensei_user_notes',true);
create policy cs_identity_guard on public.code_sensei_user_notes as restrictive for all to public
 using (user_id::text=(select ga_private.code_sensei_identity())::text) with check (user_id::text=(select ga_private.code_sensei_identity())::text);
alter table public.code_sensei_user_notes alter column user_id set not null;
create trigger cs_keep_owner before update on public.code_sensei_user_notes
 for each row execute function ga_private.code_sensei_keep_owner();
select ga_private.set_browser_access('public.code_sensei_users',false);
create policy cs_identity_guard on public.code_sensei_users as restrictive for all to public
 using (id=(select ga_private.code_sensei_identity())) with check (id=(select ga_private.code_sensei_identity()));
select ga_private.set_browser_access('public.code_sensei_wrong_answers',true);
create policy cs_identity_guard on public.code_sensei_wrong_answers as restrictive for all to public
 using (user_id::text=(select ga_private.code_sensei_identity())::text) with check (user_id::text=(select ga_private.code_sensei_identity())::text);
alter table public.code_sensei_wrong_answers alter column user_id set not null;
create trigger cs_keep_owner before update on public.code_sensei_wrong_answers
 for each row execute function ga_private.code_sensei_keep_owner();

-- Only the two existing browser publication paths keep INSERT. No shared
-- UPDATE/DELETE: changing a course-day key must not cascade into another owner.
grant insert on public.code_sensei_course_days, public.code_sensei_diff_explanations to authenticated;

-- Daily missions and missed questions are unique per owner, not globally.
alter table public.code_sensei_daily drop constraint code_sensei_daily_day_key,
 add constraint cs_daily_owner_day unique(user_id,day);
alter table public.code_sensei_wrong_answers drop constraint code_sensei_wrong_answers_challenge_id_key,
 add constraint cs_wrong_owner_challenge unique(user_id,challenge_id);
alter table public.code_sensei_player add constraint cs_player_owner unique(user_id);
-- Keep a mistake's optional attempt in the same exercise. Existing single-column
-- ON DELETE SET NULL remains; the composite check accepts the resulting NULL.
alter table public.code_sensei_attempts add constraint cs_attempt_exercise unique(id,exercise_id);
alter table public.code_sensei_mistakes add constraint cs_mistake_attempt_exercise
 foreign key(attempt_id,exercise_id) references public.code_sensei_attempts(id,exercise_id);

-- Sequences allocate IDs only; browser roles may not reset another owner's IDs.
do $sequences$
declare s regclass; browser name; privilege text; name text;
begin
 for name in select table_name from cs_reviewed loop
  s:=pg_get_serial_sequence('public.'||name,'id')::regclass;
  if s is not null then
   execute format('revoke all on sequence %s from public,anon,authenticated',s);
   if name<>'code_sensei_lesson_steps' then execute format('grant usage on sequence %s to authenticated',s); end if;
   foreach browser in array array['anon','authenticated'] loop
    foreach privilege in array array['USAGE','SELECT','UPDATE'] loop
     if has_sequence_privilege(browser,s,privilege) is distinct from
      (browser='authenticated' and privilege='USAGE' and name<>'code_sensei_lesson_steps')
     then raise exception 'review inherited sequence privilege on %',s; end if;
    end loop;
   end loop;
  end if;
 end loop;
end; $sequences$;
-- Retry receipts are private and account scoped. Invoker execution keeps normal
-- table RLS in force, including on a retried request after access revocation.
create table ga_private.code_sensei_receipts (
 auth_user_id uuid not null default auth.uid(), operation_id uuid not null,
 legacy_id uuid not null, payload jsonb not null, response jsonb,
 primary key(auth_user_id,operation_id)
);
alter table ga_private.code_sensei_receipts enable row level security;
revoke all on ga_private.code_sensei_receipts from public,anon,authenticated,service_role;
grant select,insert,update on ga_private.code_sensei_receipts to authenticated;
create policy cs_receipt_owner on ga_private.code_sensei_receipts to authenticated
 using(auth_user_id=(select auth.uid()) and legacy_id=(select ga_private.code_sensei_identity()))
 with check(auth_user_id=(select auth.uid()) and legacy_id=(select ga_private.code_sensei_identity()));
create function public.code_sensei_apply_offline(operation_id uuid, payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare identity_id uuid:=public.code_sensei_current_user_id(); prior ga_private.code_sensei_receipts;
 target text:=payload->>'table'; action text:=payload->>'action'; body jsonb:=payload->'data';
 columns_sql text; values_sql text; result jsonb; row_count integer;
begin
 if operation_id is null or jsonb_typeof(payload) is distinct from 'object' or jsonb_typeof(body) is distinct from 'object'
  or octet_length(payload::text)>1048576 or target is null or target not in
   ('code_sensei_attempts','code_sensei_mistakes','code_sensei_wrong_answers','code_sensei_exercises')
  or action is null or action not in ('post','patch') or (action='post' and target='code_sensei_exercises')
 then raise exception 'invalid offline operation' using errcode='22023'; end if;
 if exists(select from jsonb_object_keys(body) k where k in ('id','created_at')
   or not exists(select from pg_catalog.pg_attribute a where a.attrelid=('public.'||target)::regclass
    and a.attname=k and a.attnum>0 and not a.attisdropped))
 then raise exception 'invalid offline field' using errcode='22023'; end if;
 if body ? 'user_id' and body->>'user_id' is distinct from identity_id::text
 then raise exception 'foreign offline owner' using errcode='42501'; end if;
 insert into ga_private.code_sensei_receipts(auth_user_id,operation_id,legacy_id,payload)
 values(auth.uid(),operation_id,identity_id,payload) on conflict do nothing;
 select * into strict prior from ga_private.code_sensei_receipts r
 where r.auth_user_id=auth.uid() and r.operation_id=code_sensei_apply_offline.operation_id for update;
 if prior.payload is distinct from payload or prior.legacy_id<>identity_id
 then raise exception 'offline operation conflict' using errcode='22023'; end if;
 if prior.response is not null then return prior.response; end if;
 select string_agg(pg_catalog.format('%I',k),',' order by k),
  string_agg(pg_catalog.format('(pg_catalog.jsonb_populate_record(null::public.%I,$1)).%I',target,k),',' order by k)
  into columns_sql,values_sql from jsonb_object_keys(body) k;
 if columns_sql is null then raise exception 'empty offline operation' using errcode='22023'; end if;
 if action='post' then
  execute pg_catalog.format('insert into public.%I(%s) select %s returning to_jsonb(%I.*)',target,columns_sql,values_sql,target)
   into result using body;
 else
  if payload->>'id' is null or payload->>'id' !~ '^[0-9]+$' then raise exception 'invalid offline row' using errcode='22023'; end if;
  execute pg_catalog.format('update public.%I set (%s)=(select %s) where id=$2 returning to_jsonb(%I.*)',target,columns_sql,values_sql,target)
   into result using body,(payload->>'id')::bigint;
 end if;
 get diagnostics row_count=row_count;
 if row_count<>1 or result is null then raise exception 'offline row unavailable' using errcode='42501'; end if;
 update ga_private.code_sensei_receipts r set response=jsonb_build_array(result)
 where r.auth_user_id=auth.uid() and r.operation_id=code_sensei_apply_offline.operation_id;
 return jsonb_build_array(result);
end; $$;
revoke all on function public.code_sensei_apply_offline(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.code_sensei_apply_offline(uuid,jsonb) to authenticated;

-- Replace a project's files in one transaction. A failed file insert restores
-- the previous project and files, including when a request loses authorization.
create function public.code_sensei_save_project(project_id integer, project_name text, view_mode text, files jsonb) returns integer
language plpgsql security invoker set search_path='' as $$
declare identity_id uuid:=public.code_sensei_current_user_id(); saved_id integer; item jsonb; position integer:=0;
begin
 if project_name is null or length(btrim(project_name)) not between 1 and 200
  or view_mode is null or view_mode not in ('single','class','compare') or jsonb_typeof(files) is distinct from 'array'
  or jsonb_array_length(files) not between 1 and 100 or octet_length(files::text)>5242880
 then raise exception 'invalid project' using errcode='22023'; end if;
 if project_id is null then
  insert into public.code_sensei_py_projects(user_id,project_name,view_mode)
   values(identity_id,project_name,view_mode) returning id into saved_id;
 else
  update public.code_sensei_py_projects p set project_name=code_sensei_save_project.project_name,
   view_mode=code_sensei_save_project.view_mode,updated_at=now()
   where p.id=project_id returning id into saved_id;
  if saved_id is null then raise exception 'project unavailable' using errcode='42501'; end if;
  delete from public.code_sensei_py_files f where f.project_id=saved_id;
 end if;
 for item in select value from jsonb_array_elements(files) loop
  if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'filename') is distinct from 'string'
   or jsonb_typeof(item->'code_content') is distinct from 'string' or length(item->>'filename') not between 1 and 255
  then raise exception 'invalid project file' using errcode='22023'; end if;
  insert into public.code_sensei_py_files(project_id,filename,code_content,file_order)
   values(saved_id,item->>'filename',item->>'code_content',position);
  position:=position+1;
 end loop;
 return saved_id;
end; $$;
revoke all on function public.code_sensei_save_project(integer,text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.code_sensei_save_project(integer,text,text,jsonb) to authenticated;
commit;
