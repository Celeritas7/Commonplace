-- REVIEW CANDIDATE ONLY. After 01/03 and coordinated owning-client acceptance.
-- No source rows are rewritten. This file is never deployed automatically.
begin;
set local search_path=pg_catalog,public;
lock table public.roadmap_tasks,public.roadmap_study_sessions in access exclusive mode;
lock table ga_private.roadmap_control in share mode;
do $$
declare expected record;
begin
 if not exists(select from ga_private.roadmap_control where id and not paused) then
  raise exception 'review active Roadmap session contract';
 end if;
 for expected in select * from (values
  ('public.roadmap_start_session(uuid,text,text)','e50d41426322e7c7d727cd5ad4f8b12b'),
  ('public.roadmap_complete_session(uuid,text,text,integer,jsonb,text)','53e327e1ed90da30aff201e305e0d6d1')
 ) t(signature,body_hash) loop
  if not exists(select from pg_proc where oid=to_regprocedure(expected.signature)
   and pg_get_userbyid(proowner)='postgres' and prosecdef and proconfig=array['search_path=""']
   and md5(replace(prosrc,chr(13),''))=expected.body_hash) then
   raise exception 'review candidate 03 session contract';
  end if;
 end loop;
 for expected in select * from (values
  ('roadmap_tasks','eb99159acb9018231039d6f9a56099b8'),('roadmap_study_sessions','dde0138728990ecc7a2196e0d43ced68')
 ) t(tbl,columns_hash) loop
  if not exists(select from pg_class where oid=format('public.%I',expected.tbl)::regclass and relkind='r' and relrowsecurity)
   or (select md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull::text||':'||
     coalesce(pg_get_expr(d.adbin,d.adrelid),''),'|' order by a.attnum))
    from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    where a.attrelid=format('public.%I',expected.tbl)::regclass and a.attnum>0 and not a.attisdropped) is distinct from expected.columns_hash
   or (select count(*) from pg_policies where schemaname='public' and tablename=expected.tbl)<>1
   or not exists(select from pg_policies where schemaname='public' and tablename=expected.tbl
    and cmd='ALL' and permissive='PERMISSIVE' and roles='{authenticated}'
    and qual='(user_id = auth.uid())' and with_check=qual) then
   raise exception 'review Roadmap task/session baseline';
  end if;
 end loop;
 if (select count(*) from pg_trigger where not tgisinternal and tgrelid in
  ('roadmap_tasks'::regclass,'roadmap_study_sessions'::regclass))<>1
 or not exists(select from pg_trigger where tgrelid='roadmap_tasks'::regclass
  and tgname='roadmap_tasks_set_updated_at' and tgfoid='roadmap_set_updated_at()'::regprocedure
  and tgtype=19 and tgenabled='O')
 or not exists(select from pg_proc where oid='roadmap_set_updated_at()'::regprocedure and not prosecdef
  and md5(replace(prosrc,chr(13),''))='9b1889f56258bf9d6554213c05019c76') then
  raise exception 'review task/session trigger dependencies';
 end if;
 if not exists(select from pg_constraint where conrelid='roadmap_tasks'::regclass
  and conname='ga_parent_owner' and convalidated and
  pg_get_constraintdef(oid)='FOREIGN KEY (parent_id, user_id) REFERENCES roadmap_tasks(id, user_id) ON DELETE CASCADE')
 or not exists(select from pg_constraint where conrelid='roadmap_study_sessions'::regclass
  and conname='ga_session_task_owner' and convalidated and
  pg_get_constraintdef(oid)='FOREIGN KEY (task_id, user_id) REFERENCES roadmap_tasks(id, user_id) ON DELETE CASCADE') then
  raise exception 'review candidate 03 owner constraints';
 end if;
end $$;

-- The private receipt is an operation identity, not a cached authorization grant.
-- Replays recheck the pause, verified identity and current task ownership.
create table ga_private.roadmap_daily_receipts (
 auth_user_id uuid not null,
 request_id uuid not null,
 task_id uuid not null,
 payload jsonb not null,
 created_at timestamptz not null default now(),
 primary key(auth_user_id,request_id),
 foreign key(task_id,auth_user_id) references public.roadmap_tasks(id,user_id) on delete cascade
);
alter table ga_private.roadmap_daily_receipts enable row level security;
revoke all on ga_private.roadmap_daily_receipts from public,anon,authenticated,service_role;

create function public.ga_roadmap_set_daily_task(p_task_id uuid,p_expected_updated_at timestamptz,
 p_done boolean,p_day_key text,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); task public.roadmap_tasks; session public.roadmap_study_sessions;
 logical_day date; request jsonb; prior jsonb; replayed boolean;
begin
 perform 1 from ga_private.roadmap_control where id and not paused for share;
 if not found then raise exception 'session access denied' using errcode='42501'; end if;
 perform 1 from auth.users where id=actor and email_confirmed_at is not null
  and is_anonymous is false and coalesce(auth.jwt()->>'is_anonymous','false')='false' for share;
 if not found then raise exception 'session access denied' using errcode='42501'; end if;
 if p_task_id is null or p_expected_updated_at is null or p_request_id is null or p_done is null
  or p_day_key is null or p_day_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
  raise exception 'invalid daily action' using errcode='22023';
 end if;
 logical_day:=p_day_key::date;
 select * into task from public.roadmap_tasks where id=p_task_id and user_id=actor for update;
 if not found then raise exception 'session access denied' using errcode='42501'; end if;
 request:=jsonb_build_object('task_id',p_task_id,'expected_updated_at',extract(epoch from p_expected_updated_at),
  'done',p_done,'day_key',p_day_key);
 select payload into prior from ga_private.roadmap_daily_receipts
  where auth_user_id=actor and request_id=p_request_id;
 replayed:=found;
 if replayed then
  if prior is distinct from request then raise exception 'request ID already used' using errcode='22023'; end if;
 else
  if task.updated_at is distinct from p_expected_updated_at then
   raise exception 'task changed; refresh before another action' using errcode='40001';
  end if;
  if task.kind is distinct from 'task' or not coalesce('daily-routine'=any(task.tags),false) then
   raise exception 'daily task required' using errcode='22023';
  end if;
  -- Match the current legacy streak UI without trusting a caller-supplied count.
  if task.done is distinct from p_done then
   if p_done and task.streak_day is distinct from logical_day then
    task.streak:=case when task.streak_day=logical_day-1 then task.streak+1 else 1 end;
    task.streak_day:=logical_day;
   elsif not p_done and task.streak_day=logical_day then
    task.streak:=greatest(0,task.streak-1);
    task.streak_day:=case when task.streak>0 then logical_day-1 else null end;
   end if;
  end if;
  update public.roadmap_tasks set done=p_done,streak=task.streak,streak_day=task.streak_day
   where id=p_task_id and user_id=actor returning * into task;
  if not found or task.done is distinct from p_done then
   raise exception 'task write not confirmed' using errcode='42501';
  end if;
  if p_done then
   insert into public.roadmap_study_sessions as s(user_id,task_id,day_key,source,completed_at,verification)
    values(actor,p_task_id,p_day_key,'roadmap',now(),'manual')
   on conflict(task_id,day_key) do update set
    completed_at=coalesce(s.completed_at,excluded.completed_at),
    source=case when s.completed_at is not null and s.verification<>'manual' then s.source else 'roadmap' end,
    verification=case when s.completed_at is not null and s.verification<>'manual' then s.verification else 'manual' end
   where s.user_id=actor;
   if not found then raise exception 'session write not confirmed' using errcode='42501'; end if;
  else
   -- Undo only manual evidence. Study-app completion remains proven, matching the
   -- existing client contract. No zero-row update is mistaken for a missing task.
   select * into session from public.roadmap_study_sessions
    where task_id=p_task_id and day_key=p_day_key and user_id=actor for update;
   if found and (session.completed_at is null or session.verification='manual') then
    update public.roadmap_study_sessions set completed_at=null,verification='manual'
     where id=session.id and user_id=actor;
    if not found then raise exception 'session write not confirmed' using errcode='42501'; end if;
   end if;
  end if;
  insert into ga_private.roadmap_daily_receipts(auth_user_id,request_id,task_id,payload)
   values(actor,p_request_id,p_task_id,request);
 end if;
 -- Replays return CURRENT owned rows. An old acknowledgement cannot restore a
 -- checkbox that was subsequently undone on another device.
 select * into session from public.roadmap_study_sessions
  where task_id=p_task_id and day_key=p_day_key and user_id=actor;
 return jsonb_build_object('request_id',p_request_id,'replayed',replayed,
  'task',to_jsonb(task)-'user_id','session',case when session.id is null then null else to_jsonb(session)-'user_id' end);
end; $$;
revoke all on function public.ga_roadmap_set_daily_task(uuid,timestamptz,boolean,text,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.ga_roadmap_set_daily_task(uuid,timestamptz,boolean,text,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
