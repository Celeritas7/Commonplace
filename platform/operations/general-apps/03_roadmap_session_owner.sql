-- REVIEW CANDIDATE ONLY. Existing client signature and idempotency are preserved.
begin;
set local search_path=pg_catalog,public;
lock table public.roadmap_tasks,public.roadmap_study_sessions in access exclusive mode;
do $$
declare routine record; target record; relation regclass;
begin
 for routine in select * from (values
  ('public.roadmap_start_session(uuid,text,text)','28491d7335aeefe874e6167b984c57ad'),
  ('public.roadmap_complete_session(uuid,text,text,integer,jsonb,text)','4f1fbfe95c409b88a6e17f3e080c3c9e')
 ) as r(signature,fingerprint) loop
  if not exists(select from pg_proc p where p.oid=to_regprocedure(routine.signature)
    and pg_get_userbyid(p.proowner)='postgres' and p.prosecdef and p.prorettype='uuid'::regtype
    and md5(replace(p.prosrc,E'\r\n',E'\n'))=routine.fingerprint) then
   raise exception 'session function changed since review: %',routine.signature;
  end if;
 end loop;
 for target in select * from (values ('roadmap_tasks','parent_id'),
   ('roadmap_study_sessions','task_id')) as t(tbl,key_col) loop
  relation:=format('public.%I',target.tbl)::regclass;
  if not exists(select from pg_class where oid=relation and relrowsecurity and relkind='r')
    or (select count(*) from pg_policies where schemaname='public' and tablename=target.tbl)<>1
    or not exists(select from pg_policies where schemaname='public' and tablename=target.tbl
     and cmd='ALL' and roles='{authenticated}' and permissive='PERMISSIVE'
     and qual='(user_id = auth.uid())' and with_check=qual)
    or not exists(select from pg_attribute where attrelid=relation and attname='user_id' and attnotnull)
    or not exists(select from pg_constraint where conrelid=relation and contype='f' and convalidated
     and confrelid='public.roadmap_tasks'::regclass and pg_get_constraintdef(oid)=
      format('FOREIGN KEY (%I) REFERENCES roadmap_tasks(id) ON DELETE CASCADE',target.key_col)) then
   raise exception 'review Roadmap ownership and cascade baseline for %',relation;
  end if;
  perform ga_private.set_browser_access(relation,true);
 end loop;
end $$;
-- Validated inside this transaction. An existing mismatch stops installation
-- and preserves all records. Null task IDs and root tasks remain supported.
alter table public.roadmap_tasks add constraint ga_task_owner unique(id,user_id);
alter table public.roadmap_tasks add constraint ga_parent_owner
 foreign key(parent_id,user_id) references public.roadmap_tasks(id,user_id) on delete cascade;
alter table public.roadmap_study_sessions add constraint ga_session_task_owner
 foreign key(task_id,user_id) references public.roadmap_tasks(id,user_id) on delete cascade;
create or replace function public.roadmap_start_session(p_task_id uuid,p_day_key text,p_source text default 'roadmap')
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result uuid;
begin
 if actor is null then raise exception 'session access denied' using errcode='42501'; end if;
 -- Hold the task row so ownership cannot change between this check and insert.
 perform 1 from public.roadmap_tasks where id=p_task_id and user_id=actor for update;
 if not found then raise exception 'session access denied' using errcode='42501'; end if;
 insert into public.roadmap_study_sessions(user_id,task_id,day_key,source,started_at)
 values(actor,p_task_id,p_day_key,p_source,now())
 on conflict(task_id,day_key) do update
  set started_at=coalesce(roadmap_study_sessions.started_at,now())
  where roadmap_study_sessions.user_id=actor
 returning id into result;
 if result is null then raise exception 'session access denied' using errcode='42501'; end if;
 return result;
end; $$;
create or replace function public.roadmap_complete_session(p_task_id uuid,p_source text,
 p_day_key text default null,p_duration integer default null,p_feedback jsonb default '{}',
 p_verification text default 'app')
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result uuid;
 day_value text:=coalesce(p_day_key,to_char(now()-interval '4 hours','YYYY-MM-DD'));
begin
 if actor is null then raise exception 'session access denied' using errcode='42501'; end if;
 if p_verification not in ('app','api','manual') then raise exception 'bad verification: %',p_verification; end if;
 perform 1 from public.roadmap_tasks where id=p_task_id and user_id=actor for update;
 if not found then raise exception 'session access denied' using errcode='42501'; end if;
 insert into public.roadmap_study_sessions(user_id,task_id,day_key,source,completed_at,duration_min,feedback,verification)
 values(actor,p_task_id,day_value,p_source,now(),p_duration,p_feedback,p_verification)
 on conflict(task_id,day_key) do update set completed_at=now(),
  duration_min=coalesce(excluded.duration_min,roadmap_study_sessions.duration_min),
  feedback=roadmap_study_sessions.feedback || excluded.feedback,
  source=excluded.source,verification=excluded.verification
 where roadmap_study_sessions.user_id=actor
 returning id into result;
 if result is null then raise exception 'session access denied' using errcode='42501'; end if;
 return result;
end; $$;
revoke all on function public.roadmap_start_session(uuid,text,text),
 public.roadmap_complete_session(uuid,text,text,integer,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.roadmap_start_session(uuid,text,text),
 public.roadmap_complete_session(uuid,text,text,integer,jsonb,text) to authenticated;
commit;
