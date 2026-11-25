-- REVIEW CANDIDATE ONLY. Existing client signature and idempotency are preserved.
begin;
do $$
begin
 if not exists(select 1 from pg_proc p where p.oid=to_regprocedure('public.roadmap_start_session(uuid,text,text)')
  and pg_get_userbyid(p.proowner)='postgres' and p.prosecdef
  and p.prorettype='uuid'::regtype
  and md5(replace(p.prosrc,E'\r\n',E'\n'))='28491d7335aeefe874e6167b984c57ad') then
  raise exception 'session function changed since review; inspect new definition';
 end if;
end $$;
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
revoke all on function public.roadmap_start_session(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.roadmap_start_session(uuid,text,text) to authenticated;
commit;
