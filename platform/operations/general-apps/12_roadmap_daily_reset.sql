-- REVIEW CANDIDATE ONLY. After 01/03/08 and coordinated owning-client acceptance.
-- No source rows are rewritten. This file is never deployed automatically.
begin;
set local search_path=pg_catalog,public;
set local lock_timeout='5s';
set local statement_timeout='60s';
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
  if not exists(select from pg_class where oid=format('public.%I',expected.tbl)::regclass and relkind='r' and relrowsecurity and pg_get_userbyid(relowner)='postgres')
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
  and pg_get_userbyid(proowner)='postgres' and md5(replace(prosrc,chr(13),''))='9b1889f56258bf9d6554213c05019c76') then
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

do $$ begin
 if not exists(select from pg_proc where oid=to_regprocedure('public.ga_roadmap_set_daily_task(uuid,timestamptz,boolean,text,uuid)')
  and prosecdef and pg_get_userbyid(proowner)='postgres' and proconfig=array['search_path=""']
  and md5(replace(prosrc,chr(13),''))='2e98874954dda617b50cd1928efec15e') then
  raise exception 'review candidate 08 daily-action contract';
 end if;
end $$;

-- Retained history is independent of task deletion. It is never an authorization
-- grant; replay checks current access to every target and cannot recreate rows.
create table ga_private.roadmap_reset_receipts (
 auth_user_id uuid not null,request_id uuid not null,payload jsonb not null,
 before_tasks jsonb not null,after_tasks jsonb not null,
 created_at timestamptz not null default now(),primary key(auth_user_id,request_id)
);
alter table ga_private.roadmap_reset_receipts enable row level security;
revoke all on ga_private.roadmap_reset_receipts from public,anon,authenticated,service_role;

create function public.ga_roadmap_reset_daily_tasks(p_tasks jsonb,p_day_key text,p_timezone text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=auth.uid(); intent jsonb; entry jsonb; ids uuid[]:='{}'; target uuid; expected timestamptz;
 day date; normalized jsonb:='[]'; before_rows jsonb; after_rows jsonb; request jsonb; previous jsonb;
 task public.roadmap_tasks; written public.roadmap_tasks; replayed boolean;
begin
 perform from ga_private.roadmap_control where id and not paused for share;
 if not found then raise exception 'daily reset access denied' using errcode='42501'; end if;
 perform from auth.users where id=actor and email_confirmed_at is not null and is_anonymous is false
  and coalesce(auth.jwt()->>'is_anonymous','false')='false' for share;
 if not found then raise exception 'daily reset access denied' using errcode='42501'; end if;
 if p_request_id is null or p_day_key is null or p_day_key!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  or p_timezone is null or length(p_timezone) not between 1 and 100
  or not exists(select from pg_timezone_names where name=p_timezone)
  or p_tasks is null or jsonb_typeof(p_tasks)<>'array' or octet_length(p_tasks::text)>32768 then
  raise exception 'invalid daily reset' using errcode='22023';
 end if;
 begin day:=p_day_key::date;
 exception when datetime_field_overflow or invalid_datetime_format then
  raise exception 'invalid reset day' using errcode='22023'; end;
 if jsonb_array_length(p_tasks) not between 1 and 100 then
  raise exception 'reset requires 1 to 100 explicit tasks' using errcode='22023';
 end if;
 for entry in select value from jsonb_array_elements(p_tasks) loop
  if jsonb_typeof(entry)<>'object' then raise exception 'invalid reset target' using errcode='22023'; end if;
  if exists(select from jsonb_object_keys(entry) k where k not in ('id','expected_updated_at'))
   or jsonb_typeof(entry->'id') is distinct from 'string'
   or jsonb_typeof(entry->'expected_updated_at') is distinct from 'string'
   or entry->>'expected_updated_at'!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$' then
   raise exception 'invalid reset target' using errcode='22023';
  end if;
  begin target:=(entry->>'id')::uuid;expected:=(entry->>'expected_updated_at')::timestamptz;
  exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format then
   raise exception 'invalid reset target' using errcode='22023'; end;
  if target=any(ids) or not isfinite(expected) then raise exception 'invalid reset target' using errcode='22023'; end if;
  ids:=array_append(ids,target);
  normalized:=normalized||jsonb_build_array(jsonb_build_object('id',target,'expected_updated_at',extract(epoch from expected)));
 end loop;
 select jsonb_agg(value order by value->>'id') into normalized from jsonb_array_elements(normalized);
 request:=jsonb_build_object('tasks',normalized,'day_key',p_day_key,'timezone',p_timezone);
 perform pg_advisory_xact_lock(hashtextextended(actor::text,12012));
 -- Lock all rows before testing versions or the day. A mixed stale/foreign batch
 -- must never partially reset a set of checkboxes.
 perform from public.roadmap_tasks where id=any(ids) and user_id=actor order by id for update;
 if (select count(*) from public.roadmap_tasks where id=any(ids) and user_id=actor)<>cardinality(ids) then
  raise exception 'daily reset access denied' using errcode='42501';
 end if;
 select payload into previous from ga_private.roadmap_reset_receipts where auth_user_id=actor and request_id=p_request_id;
 replayed:=found;
 if replayed then
  if previous is distinct from request then raise exception 'request ID already used' using errcode='22023'; end if;
 else
  -- Preserve the existing local-time-minus-four-hours convention. Check server
  -- time AFTER lock waits; a delayed, uncommitted old-day intent needs review.
  if day<>((clock_timestamp()-interval '4 hours') at time zone p_timezone)::date then
   raise exception 'reset day changed; review current tasks' using errcode='40001';
  end if;
  select jsonb_agg(to_jsonb(t)-'user_id' order by t.id) into before_rows
   from public.roadmap_tasks t where id=any(ids) and user_id=actor;
  for intent in select value from jsonb_array_elements(normalized) loop
   select * into task from public.roadmap_tasks where id=(intent->>'id')::uuid and user_id=actor;
   if task.updated_at is null or extract(epoch from task.updated_at) is distinct from (intent->>'expected_updated_at')::numeric then
    raise exception 'task changed; review daily reset' using errcode='40001';
   end if;
   if task.kind is distinct from 'task' or not coalesce('daily-routine'=any(task.tags),false) then
    raise exception 'daily task required' using errcode='22023';
   end if;
   if task.done is distinct from true or not isfinite(task.updated_at)
    or ((task.updated_at-interval '4 hours') at time zone p_timezone)::date>=day then
    raise exception 'task is not due for reset' using errcode='40001';
   end if;
   update public.roadmap_tasks set done=false where id=task.id and user_id=actor returning * into written;
   if not found or written.done is distinct from false or written.updated_at is not distinct from task.updated_at
    or (to_jsonb(written)-'done'-'updated_at') is distinct from (to_jsonb(task)-'done'-'updated_at') then
    raise exception 'daily reset write not confirmed' using errcode='42501';
   end if;
  end loop;
  select jsonb_agg(to_jsonb(t)-'user_id' order by t.id) into after_rows
   from public.roadmap_tasks t where id=any(ids) and user_id=actor;
  insert into ga_private.roadmap_reset_receipts(auth_user_id,request_id,payload,before_tasks,after_tasks)
   values(actor,p_request_id,request,before_rows,after_rows);
  if not found then raise exception 'daily reset history not confirmed' using errcode='42501'; end if;
 end if;
 select jsonb_agg(to_jsonb(t)-'user_id' order by t.id) into after_rows
  from public.roadmap_tasks t where id=any(ids) and user_id=actor;
 return jsonb_build_object('request_id',p_request_id,'replayed',replayed,
  'day_key',p_day_key,'timezone',p_timezone,'tasks',after_rows);
end $$;
revoke all on function public.ga_roadmap_reset_daily_tasks(jsonb,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.ga_roadmap_reset_daily_tasks(jsonb,text,text,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
