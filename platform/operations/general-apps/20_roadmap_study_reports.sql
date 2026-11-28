-- REVIEW CANDIDATE ONLY. After 01/03/09/19; source registration and caller cutover need separate approval.
-- App-reported completion is NOT independent attestation. No hosted install or legacy caller change.
begin;
set local search_path=pg_catalog,public;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.roadmap_tasks,public.roadmap_study_sessions in access exclusive mode;
lock table ga_private.roadmap_control in share mode;
do $$ declare expected record; relation regclass; begin
 if to_regclass('ga_private.roadmap_done_receipts') is null then raise exception 'review candidate 19';end if;
 for expected in select * from (values
  ('roadmap_tasks','eb99159acb9018231039d6f9a56099b8'),
  ('roadmap_study_sessions','dde0138728990ecc7a2196e0d43ced68')
 ) t(tbl,columns_hash) loop
  relation:=format('public.%I',expected.tbl)::regclass;
  if not exists(select from pg_class where oid=relation and relkind='r' and relrowsecurity and pg_get_userbyid(relowner)='postgres')
   or (select md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull::text||':'||
    coalesce(pg_get_expr(d.adbin,d.adrelid),''),'|' order by a.attnum)) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    where a.attrelid=relation and a.attnum>0 and not a.attisdropped) is distinct from expected.columns_hash
   or (select count(*) from pg_policies where schemaname='public' and tablename=expected.tbl)<>1
   or not exists(select from pg_policies where schemaname='public' and tablename=expected.tbl and cmd='ALL' and roles='{authenticated}'
    and permissive='PERMISSIVE' and qual='(user_id = auth.uid())' and with_check=qual) then raise exception 'review session record baseline';end if;
 end loop;
 if not exists(select from pg_constraint where conrelid='roadmap_study_sessions'::regclass and conname='ga_session_task_owner' and convalidated
  and pg_get_constraintdef(oid)='FOREIGN KEY (task_id, user_id) REFERENCES roadmap_tasks(id, user_id) ON DELETE CASCADE') then raise exception 'review session ownership';end if;
 if not exists(select from pg_constraint where conrelid='roadmap_study_sessions'::regclass and contype='u' and convalidated and pg_get_constraintdef(oid)='UNIQUE (task_id, day_key)')
  or not exists(select from pg_constraint where conrelid='roadmap_study_sessions'::regclass and contype='p' and convalidated and pg_get_constraintdef(oid)='PRIMARY KEY (id)') then raise exception 'review session keys';end if;
 if (select count(*) from pg_trigger where not tgisinternal and tgrelid in ('roadmap_tasks'::regclass,'roadmap_study_sessions'::regclass))<>1
  or not exists(select from pg_trigger where tgrelid='roadmap_tasks'::regclass and tgname='roadmap_tasks_set_updated_at' and tgtype=19 and tgenabled='O'
   and tgfoid='roadmap_set_updated_at()'::regprocedure)
  or not exists(select from pg_proc where oid='roadmap_set_updated_at()'::regprocedure and not prosecdef and pg_get_userbyid(proowner)='postgres'
   and md5(replace(prosrc,chr(13),''))='9b1889f56258bf9d6554213c05019c76') then raise exception 'review session triggers';end if;
 if not exists(select from pg_proc where oid='roadmap_complete_session(uuid,text,text,integer,jsonb,text)'::regprocedure and prosecdef
  and pg_get_userbyid(proowner)='postgres' and md5(replace(prosrc,chr(13),''))='53e327e1ed90da30aff201e305e0d6d1') then raise exception 'review legacy completion contract';end if;
end $$;

-- These are read-only dependencies. Refuse public/non-owner policies and ambiguous keys.
do $$ declare relation regclass; name text; begin
 foreach name in array array['akatsuki_requests','akatsuki_vocab'] loop
  relation:=format('public.%I',name)::regclass;
  if not exists(select from pg_class where oid=relation and relkind='r' and relrowsecurity and pg_get_userbyid(relowner)='postgres')
   or (select count(*) from pg_policies where schemaname='public' and tablename=name)<>1
   or not exists(select from pg_policies where schemaname='public' and tablename=name and cmd='ALL' and roles='{authenticated}'
    and permissive='PERMISSIVE' and qual='(user_id = auth.uid())' and with_check=qual) then raise exception 'review hub ownership catalog: %',name;end if;
 end loop;
 if not exists(select from pg_constraint where conrelid='akatsuki_requests'::regclass and contype='p' and convalidated and pg_get_constraintdef(oid)='PRIMARY KEY (seq)')
  or not exists(select from pg_constraint where conrelid='akatsuki_requests'::regclass and contype='u' and convalidated and pg_get_constraintdef(oid)='UNIQUE (user_id, idempotency_key)')
  or not exists(select from pg_constraint where conrelid='akatsuki_vocab'::regclass and contype='p' and convalidated and pg_get_constraintdef(oid)='PRIMARY KEY (user_id, ns, id)') then raise exception 'review hub keys';end if;
 if exists(select from (values
  ('akatsuki_requests','seq','bigint'),('akatsuki_requests','user_id','uuid'),('akatsuki_requests','reply_seq','bigint'),
  ('akatsuki_requests','from_app','text'),('akatsuki_requests','to_app','text'),('akatsuki_requests','kind','text'),
  ('akatsuki_requests','idempotency_key','text'),('akatsuki_requests','src_addr','jsonb'),('akatsuki_requests','payload','jsonb'),('akatsuki_requests','reply','jsonb'),
  ('akatsuki_vocab','user_id','uuid'),('akatsuki_vocab','ns','text'),('akatsuki_vocab','id','text'),('akatsuki_vocab','schema','jsonb')
 ) required(tbl,col,typ) where not exists(select from pg_attribute where attrelid=format('public.%I',tbl)::regclass and attname=col and not attisdropped and format_type(atttypid,atttypmod)=typ)) then
  raise exception 'review hub reader columns';end if;
end $$;


-- Empty, operator-only review registry. No browser can enable or select a source.
create table ga_private.roadmap_study_sources(
 auth_user_id uuid not null,from_app text not null,source text not null,
 enabled boolean not null default false,key_mode text not null check(key_mode in ('daily','request')),
 review_ref text not null check(length(btrim(review_ref))>0),primary key(auth_user_id,from_app)
);
create table ga_private.roadmap_study_report_receipts(
 auth_user_id uuid not null,seq bigint not null,task_id uuid not null,day_key text not null,
 event jsonb not null,outcome text not null,created_at timestamptz not null default now(),primary key(auth_user_id,seq)
);
create table ga_private.roadmap_study_report_pairs(
 auth_user_id uuid not null,task_id uuid not null,day_key text not null,last_seq bigint not null,
 session_id uuid,row_snapshot jsonb,managed boolean not null,primary key(auth_user_id,task_id,day_key)
);
alter table ga_private.roadmap_study_sources enable row level security;
alter table ga_private.roadmap_study_report_receipts enable row level security;
alter table ga_private.roadmap_study_report_pairs enable row level security;
revoke all on ga_private.roadmap_study_sources,ga_private.roadmap_study_report_receipts,ga_private.roadmap_study_report_pairs
 from public,anon,authenticated,service_role;

create function public.ga_roadmap_receive_study_report(p_seq bigint) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=auth.uid();event_row public.akatsuki_requests;source_row ga_private.roadmap_study_sources;
 receipt ga_private.roadmap_study_report_receipts;pair ga_private.roadmap_study_report_pairs;
 session_row public.roadmap_study_sessions;event_value jsonb;payload jsonb;task uuid;day_value text;duration integer;
 vocabulary jsonb;feedback_value jsonb;outcome_value text;replayed boolean;field text;enum_name text;
begin
 if p_seq is null or p_seq<1 or p_seq>9007199254740991 then raise exception 'invalid report sequence' using errcode='22023';end if;
 perform from ga_private.roadmap_control where id and not paused for share;
 if not found then raise exception 'study report access denied' using errcode='42501';end if;
 perform from auth.users where id=actor and email_confirmed_at is not null and is_anonymous is false
  and coalesce(auth.jwt()->>'is_anonymous','false')='false' for share;
 if not found then raise exception 'study report access denied' using errcode='42501';end if;
 -- Shared lock order with other prepared Roadmap writes. Read only this owner's hub row.
 perform pg_advisory_xact_lock(hashtextextended(actor::text,15015));
 select * into event_row from public.akatsuki_requests where seq=p_seq and user_id=actor for share;
 if not found then raise exception 'study report unavailable' using errcode='42501';end if;
 select * into source_row from ga_private.roadmap_study_sources where auth_user_id=actor and from_app=event_row.from_app and enabled for share;
 if not found then raise exception 'study caller review required' using errcode='42501';end if;
 if source_row.from_app<>'jlpt' or source_row.source<>'japanese-study-app-advanced' then raise exception 'unreviewed study caller' using errcode='40001';end if;
 if event_row.to_app<>'rm' or event_row.kind<>'session.completed' or event_row.status not in ('pending','delivered') then
  raise exception 'invalid study direction' using errcode='22023';end if;
 if octet_length(event_row.idempotency_key)>200 or octet_length(event_row.src_clock)>200 then raise exception 'oversized study metadata' using errcode='22023';end if;
 payload:=event_row.payload;
 if jsonb_typeof(payload)<>'object' or octet_length(payload::text)>16384 or jsonb_typeof(event_row.src_addr)<>'object'
  or octet_length(event_row.src_addr::text)>4096 then raise exception 'invalid study report' using errcode='22023';end if;
 select schema into vocabulary from public.akatsuki_vocab where user_id=actor and ns='kind' and id='session.completed' for share;
 if vocabulary is distinct from '{"required":["task_id","day_key","duration","mode"],"optional":["words","level","correct","test_type","source"]}'::jsonb then
  raise exception 'review study report vocabulary' using errcode='40001';end if;
 if not payload ?& array['task_id','day_key','duration','mode']
  or exists(select from jsonb_object_keys(payload) k where k<>all(array['task_id','day_key','duration','mode','words','level','correct','test_type','source']))
  or jsonb_typeof(payload->'task_id')<>'string' or (payload->>'task_id')!~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  or jsonb_typeof(payload->'day_key')<>'string' or (payload->>'day_key')!~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  or jsonb_typeof(payload->'duration')<>'number' or (payload->>'duration')!~ '^[0-9]{1,4}$'
  or jsonb_typeof(payload->'mode')<>'string' then raise exception 'invalid study fields' using errcode='22023';end if;
 task:=(payload->>'task_id')::uuid;day_value:=payload->>'day_key';duration:=(payload->>'duration')::integer;
 begin
  if to_char(day_value::date,'YYYY-MM-DD')<>day_value then raise exception 'invalid day';end if;
 exception when others then raise exception 'invalid study day' using errcode='22023';end;
 if duration<1 or duration>1440 or payload ? 'source' and payload->>'source' is distinct from source_row.source
  or event_row.src_addr->'task_id' is distinct from payload->'task_id' or event_row.src_addr->'day_key' is distinct from payload->'day_key' then
  raise exception 'study address or source mismatch' using errcode='22023';end if;
 if source_row.key_mode='daily' then
  if event_row.idempotency_key is distinct from 'jlpt:session:'||task::text||':'||day_value then raise exception 'review daily report key' using errcode='40001';end if;
 elsif event_row.idempotency_key !~* '^jlpt:session:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
  raise exception 'review request report key' using errcode='40001';
 end if;
 foreach field in array array['mode','level','test_type'] loop
  if payload ? field and not (field='level' and payload->field='null'::jsonb) then
   enum_name:=case field when 'mode' then 'jlpt_mode' when 'level' then 'jlpt_level' else 'jlpt_test_type' end;
   select schema->'values' into vocabulary from public.akatsuki_vocab where user_id=actor and ns='enum' and id=enum_name for share;
   if jsonb_typeof(vocabulary) is distinct from 'array' then raise exception 'review study enum' using errcode='40001';end if;
   if jsonb_typeof(payload->field)<>'string' or not vocabulary @> jsonb_build_array(payload->field) then raise exception 'invalid study enum' using errcode='22023';end if;
  end if;
 end loop;
 foreach field in array array['words','correct'] loop
  if payload ? field and (jsonb_typeof(payload->field)<>'number' or (payload->>field)!~ '^[0-9]{1,6}$') then
   raise exception 'invalid study count' using errcode='22023';end if;
 end loop;
 if payload ? 'correct' and (not payload ? 'words' or (payload->>'correct')::integer>(payload->>'words')::integer) then raise exception 'invalid correct count' using errcode='22023';end if;
 perform from public.roadmap_tasks where id=task and user_id=actor and kind='task' for update;
 if not found then raise exception 'study task unavailable' using errcode='42501';end if;
 event_value:=jsonb_build_object('from_app',event_row.from_app,'to_app',event_row.to_app,'kind',event_row.kind,'address',event_row.src_addr,
  'payload',payload,'key',event_row.idempotency_key,'clock',event_row.src_clock);
 select * into receipt from ga_private.roadmap_study_report_receipts where auth_user_id=actor and seq=p_seq;
 replayed:=found;
 if replayed and receipt.event is distinct from event_value then raise exception 'study sequence changed' using errcode='40001';end if;
 select * into session_row from public.roadmap_study_sessions where user_id=actor and task_id=task and day_key=day_value for update;
 select * into pair from ga_private.roadmap_study_report_pairs where auth_user_id=actor and task_id=task and day_key=day_value for update;
 if replayed then
  outcome_value:=case when session_row.id is null then 'removed' when pair.last_seq>p_seq or pair.last_seq is not null and pair.row_snapshot is distinct from to_jsonb(session_row) then 'superseded' else receipt.outcome end;
 else
  if pair.last_seq>=p_seq then outcome_value:='superseded';
  elsif pair.last_seq is not null and pair.row_snapshot is distinct from to_jsonb(session_row) then
   raise exception 'study session changed; review current record' using errcode='40001';
  elsif pair.last_seq is not null and not pair.managed or session_row.completed_at is not null and session_row.verification<>'manual' and pair.last_seq is null then
   -- Existing app/API evidence is never adopted or overwritten by this new stream.
   outcome_value:='preserved';
  else
   feedback_value:=payload-array['task_id','day_key','duration','source','test_type'];
   if payload ? 'test_type' then feedback_value:=feedback_value||jsonb_build_object('testType',payload->'test_type');end if;
   insert into public.roadmap_study_sessions as s(user_id,task_id,day_key,source,completed_at,duration_min,feedback,verification)
    values(actor,task,day_value,source_row.source,now(),duration,feedback_value,'app')
   on conflict(task_id,day_key) do update set source=excluded.source,completed_at=coalesce(s.completed_at,excluded.completed_at),
    duration_min=excluded.duration_min,feedback=s.feedback||excluded.feedback,verification='app'
   where s.user_id=actor returning * into session_row;
   if not found or session_row.verification<>'app' or session_row.completed_at is null or session_row.duration_min<>duration
    or session_row.source<>source_row.source or not session_row.feedback @> feedback_value then raise exception 'study write not confirmed' using errcode='40001';end if;
   outcome_value:='reported';
  end if;
  if outcome_value in ('reported','preserved') then
   insert into ga_private.roadmap_study_report_pairs values(actor,task,day_value,p_seq,session_row.id,to_jsonb(session_row),outcome_value='reported')
    on conflict(auth_user_id,task_id,day_key) do update set last_seq=excluded.last_seq,session_id=excluded.session_id,row_snapshot=excluded.row_snapshot,managed=excluded.managed;
   if not found then raise exception 'study ordering receipt not confirmed' using errcode='40001';end if;
  end if;
  insert into ga_private.roadmap_study_report_receipts(auth_user_id,seq,task_id,day_key,event,outcome) values(actor,p_seq,task,day_value,event_value,outcome_value);
  if not found then raise exception 'study receipt not confirmed' using errcode='40001';end if;
 end if;
 return jsonb_build_object('seq',p_seq,'task_id',task,'day_key',day_value,'replayed',replayed,'outcome',outcome_value,
  'session',case when session_row.id is null then null else to_jsonb(session_row)-'user_id' end);
end $$;
revoke all on function public.ga_roadmap_receive_study_report(bigint) from public,anon,authenticated,service_role;
grant execute on function public.ga_roadmap_receive_study_report(bigint) to authenticated;
notify pgrst,'reload schema';
commit;
