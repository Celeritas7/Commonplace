-- REVIEW CANDIDATE ONLY. After 01/03/09 and owning-client/recovery review.
-- Additive creation/retry API. No historical logs or legacy APIs are replaced.
begin;
set local search_path=pg_catalog,public;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.roadmap_tasks,public.roadmap_daily_logs in access exclusive mode;
lock table ga_private.roadmap_control in share mode;
do $$ begin
 if not exists(select from ga_private.roadmap_control where id and not paused) then
  raise exception 'review active Roadmap action control';
 end if;
 if not exists(select from pg_class where oid='public.roadmap_daily_logs'::regclass and relkind='r'
  and relrowsecurity and pg_get_userbyid(relowner)='postgres')
  or (select md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||
    coalesce(pg_get_expr(d.adbin,d.adrelid),'')||':'||a.attidentity::text,E'\n' order by a.attnum))
   from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
   where a.attrelid='public.roadmap_daily_logs'::regclass and a.attnum>0 and not a.attisdropped)
   is distinct from '526f5c0e42d4801502ad3886c5030261'
  or (select count(*) from pg_policies where schemaname='public' and tablename='roadmap_daily_logs')<>1
  or not exists(select from pg_policies where schemaname='public' and tablename='roadmap_daily_logs'
   and cmd='ALL' and roles='{authenticated}' and permissive='PERMISSIVE'
   and qual='(user_id = auth.uid())' and with_check=qual)
  or exists(select from pg_trigger where tgrelid='public.roadmap_daily_logs'::regclass and not tgisinternal) then
  raise exception 'review daily log baseline drift';
 end if;
 if not exists(select from pg_class where oid='public.roadmap_tasks'::regclass and relkind='r'
  and relrowsecurity and pg_get_userbyid(relowner)='postgres')
  or (select md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull::text||':'||
    coalesce(pg_get_expr(d.adbin,d.adrelid),''),'|' order by a.attnum))
   from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
   where a.attrelid='public.roadmap_tasks'::regclass and a.attnum>0 and not a.attisdropped)
   is distinct from 'eb99159acb9018231039d6f9a56099b8'
  or (select count(*) from pg_policies where schemaname='public' and tablename='roadmap_tasks')<>1
  or not exists(select from pg_policies where schemaname='public' and tablename='roadmap_tasks'
   and cmd='ALL' and roles='{authenticated}' and permissive='PERMISSIVE'
   and qual='(user_id = auth.uid())' and with_check=qual) then
  raise exception 'review daily log task baseline drift';
 end if;
 if not exists(select from pg_constraint where conrelid='public.roadmap_tasks'::regclass
   and conname='ga_task_owner' and convalidated and pg_get_constraintdef(oid)='UNIQUE (id, user_id)')
  or not exists(select from pg_constraint where conrelid='public.roadmap_daily_logs'::regclass
   and conname='roadmap_daily_logs_pkey' and convalidated and pg_get_constraintdef(oid)='PRIMARY KEY (id)')
  or not exists(select from pg_constraint where conrelid='public.roadmap_daily_logs'::regclass
   and conname='roadmap_daily_logs_task_id_fkey' and convalidated and pg_get_constraintdef(oid)=
   'FOREIGN KEY (task_id, user_id) REFERENCES roadmap_tasks(id, user_id) ON DELETE SET NULL (task_id)') then
  raise exception 'review candidate 03/09 daily log ownership constraints';
 end if;
end $$;

-- No cascading foreign key: evidence survives deletion, and the original UUID
-- remains reserved. A receipt never grants access or recreates a deleted entry.
create table ga_private.roadmap_log_receipts (
 auth_user_id uuid not null,request_id uuid not null,entry_id uuid not null unique,
 payload jsonb not null,created_log jsonb not null,
 created_at timestamptz not null default now(),primary key(auth_user_id,request_id)
);
alter table ga_private.roadmap_log_receipts enable row level security;
revoke all on ga_private.roadmap_log_receipts from public,anon,authenticated,service_role;

create function public.ga_roadmap_add_log(p_entry_id uuid,p_entry jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=auth.uid(); target uuid; day date; minutes integer; request jsonb;
 previous jsonb; replayed boolean; written public.roadmap_daily_logs;
begin
 perform from ga_private.roadmap_control where id and not paused for share;
 if not found then raise exception 'daily log access denied' using errcode='42501'; end if;
 perform from auth.users where id=actor and email_confirmed_at is not null and is_anonymous is false
  and coalesce(auth.jwt()->>'is_anonymous','false')='false' for share;
 if not found then raise exception 'daily log access denied' using errcode='42501'; end if;
 if p_entry_id is null or p_request_id is null or p_entry is null or jsonb_typeof(p_entry)<>'object'
  or octet_length(p_entry::text)>32768 then raise exception 'invalid daily log' using errcode='22023'; end if;
 if not p_entry ?& array['task_id','log_date','context','duration_minutes','notes']
  or exists(select from jsonb_object_keys(p_entry) k where k not in ('task_id','log_date','context','duration_minutes','notes'))
  or jsonb_typeof(p_entry->'task_id') not in ('null','string')
  or jsonb_typeof(p_entry->'log_date')<>'string'
  or p_entry->>'log_date'!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  or jsonb_typeof(p_entry->'duration_minutes')<>'number'
  or jsonb_typeof(p_entry->'context') not in ('null','string')
  or jsonb_typeof(p_entry->'notes') not in ('null','string') then
  raise exception 'invalid daily log fields' using errcode='22023';
 end if;
 if (p_entry->>'duration_minutes')::numeric not between 1 and 1440
  or (p_entry->>'duration_minutes')::numeric<>trunc((p_entry->>'duration_minutes')::numeric)
  or octet_length(p_entry->>'context')>128 or octet_length(p_entry->>'notes')>16384 then
  raise exception 'daily log exceeds field limits' using errcode='22023';
 end if;
 begin target:=(p_entry->>'task_id')::uuid;day:=(p_entry->>'log_date')::date;
 exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format then
  raise exception 'invalid daily log task or date' using errcode='22023'; end;
 minutes:=(p_entry->>'duration_minutes')::numeric::integer;
 request:=jsonb_build_object('entry_id',p_entry_id,'entry',jsonb_build_object('task_id',target,'log_date',day,
  'context',p_entry->>'context','duration_minutes',minutes,'notes',p_entry->>'notes'));
 perform pg_advisory_xact_lock(hashtextextended(actor::text,14014));
 select payload into previous from ga_private.roadmap_log_receipts where auth_user_id=actor and request_id=p_request_id;
 replayed:=found;
 if replayed then
  if previous is distinct from request then raise exception 'request ID already used' using errcode='22023'; end if;
  -- Current owned log is authoritative, even after its optional task was
  -- deleted (09 retains the log and nulls only task_id). Do not recreate either.
  select * into written from public.roadmap_daily_logs where id=p_entry_id and user_id=actor for share;
  if not found then raise exception 'daily log access denied' using errcode='42501'; end if;
 else
  if target is not null then
   perform from public.roadmap_tasks where id=target and user_id=actor and kind='task' for share;
   if not found then raise exception 'daily log task unavailable' using errcode='42501'; end if;
  end if;
  if exists(select from ga_private.roadmap_log_receipts where entry_id=p_entry_id) then
   raise exception 'daily log identity unavailable; review original retry' using errcode='42501';
  end if;
  begin
   insert into public.roadmap_daily_logs(id,user_id,task_id,log_date,context,duration_minutes,notes)
    values(p_entry_id,actor,target,day,p_entry->>'context',minutes,p_entry->>'notes') returning * into written;
   if not found or written.id is distinct from p_entry_id or written.user_id is distinct from actor
    or (to_jsonb(written)-'id'-'user_id'-'created_at') is distinct from (request->'entry')
    or written.created_at is null or not isfinite(written.created_at) then
    raise exception 'daily log write not confirmed' using errcode='42501';
   end if;
   insert into ga_private.roadmap_log_receipts(auth_user_id,request_id,entry_id,payload,created_log)
    values(actor,p_request_id,p_entry_id,request,to_jsonb(written)-'user_id');
   if not found then raise exception 'daily log receipt not confirmed' using errcode='42501'; end if;
  exception when unique_violation then
   raise exception 'daily log identity unavailable; review original retry' using errcode='42501';
  end;
 end if;
 return jsonb_build_object('request_id',p_request_id,'replayed',replayed,'entry',to_jsonb(written)-'user_id');
end $$;
revoke all on function public.ga_roadmap_add_log(uuid,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.ga_roadmap_add_log(uuid,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
