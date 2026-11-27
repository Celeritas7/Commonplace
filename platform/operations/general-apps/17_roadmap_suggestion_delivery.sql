-- REVIEW CANDIDATE ONLY. Requires 01/03/09; no hosted or automatic installation.
-- Keeps existing records/APIs. Owning clients and the real hub still need cutover acceptance.
begin;
set local search_path=pg_catalog,public;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.roadmap_tasks,public.roadmap_study_sessions,public.roadmap_suggestions,
 public.roadmap_suggestion_answers in access exclusive mode;
lock table ga_private.roadmap_control in share mode;
do $$ declare expected record; relation regclass; begin
 if not exists(select from ga_private.roadmap_control where id and not paused) then raise exception 'review Roadmap control';end if;
 for expected in select * from (values
  ('roadmap_tasks','eb99159acb9018231039d6f9a56099b8','7f5547fc577c69982d59b02eebde7def','6e5ad134423e598a1d667c79425df4ae'),
  ('roadmap_study_sessions','dde0138728990ecc7a2196e0d43ced68','3f4cb5667abe460795f38b6ae091375b','d41d8cd98f00b204e9800998ecf8427e'),
  ('roadmap_suggestions','b856cfbe3cc4fddc75f2f582a6263c89','f613f7151e3e3fc883fb847840533bc7','d41d8cd98f00b204e9800998ecf8427e'),
  ('roadmap_suggestion_answers','79d191986811090160fe2205d778e889','1f0bff451b876cbb35e5eb283609c54c','d41d8cd98f00b204e9800998ecf8427e')
 ) t(tbl,columns_hash,constraints_hash,triggers_hash) loop
  relation:=format('public.%I',expected.tbl)::regclass;
  if not exists(select from pg_class where oid=relation and relkind='r' and relrowsecurity and pg_get_userbyid(relowner)='postgres')
   or (select md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull::text||':'||
    coalesce(pg_get_expr(d.adbin,d.adrelid),''),'|' order by a.attnum)) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    where a.attrelid=relation and a.attnum>0 and not a.attisdropped) is distinct from expected.columns_hash
   or (select md5(string_agg(conname||':'||pg_get_constraintdef(oid)||':'||convalidated,E'\n' order by conname))
    from pg_constraint where conrelid=relation) is distinct from expected.constraints_hash
   or (select md5(coalesce(string_agg(tgname||':'||pg_get_triggerdef(oid)||':'||tgenabled::text,E'\n' order by tgname),''))
    from pg_trigger where tgrelid=relation and not tgisinternal) is distinct from expected.triggers_hash
   or (select count(*) from pg_policies where schemaname='public' and tablename=expected.tbl)<>1
   or not exists(select from pg_policies where schemaname='public' and tablename=expected.tbl and cmd='ALL'
    and roles='{authenticated}' and permissive='PERMISSIVE' and qual='(user_id = auth.uid())' and with_check=qual) then
   raise exception 'review suggestion record baseline: %',expected.tbl;
  end if;
 end loop;
 if not exists(select from pg_proc where oid='public.roadmap_start_session(uuid,text,text)'::regprocedure
  and prosecdef and pg_get_userbyid(proowner)='postgres' and proconfig=array['search_path=""']
  and md5(replace(prosrc,chr(13),''))='e50d41426322e7c7d727cd5ad4f8b12b') then raise exception 'review candidate 03 session routine';end if;
end $$;

create table ga_private.roadmap_answer_receipts (
 auth_user_id uuid not null,request_id uuid not null,seq bigint,payload jsonb not null,
 outcome text not null,effect jsonb,created_at timestamptz not null default now(),
 primary key(auth_user_id,request_id),unique(auth_user_id,seq)
);
alter table ga_private.roadmap_answer_receipts enable row level security;
revoke all on ga_private.roadmap_answer_receipts from public,anon,authenticated,service_role;

create function public.ga_roadmap_answer_suggestion(p_payload jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=auth.uid(); prior ga_private.roadmap_answer_receipts; suggestion public.roadmap_suggestions;
 sid text; action_value text; reason_value text; source_app text; event_seq bigint; day_value text;
 task_id uuid; log_id bigint; session_id uuid; effect_value jsonb; outcome_value text; replayed boolean:=false;
 receipt_id uuid; current_suggestion jsonb; instant timestamptz:=now();
begin
 perform from ga_private.roadmap_control where id and not paused for share;
 if not found then raise exception 'suggestion access denied' using errcode='42501';end if;
 perform from auth.users where id=actor and email_confirmed_at is not null and is_anonymous is false
  and coalesce(auth.jwt()->>'is_anonymous','false')='false' for share;
 if not found then raise exception 'suggestion access denied' using errcode='42501';end if;
 if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>16384 then
  raise exception 'invalid suggestion answer' using errcode='22023';end if;
 if not p_payload ?& array['suggestion_id','action','reason','from_app','seq','day_key','at']
  or exists(select from jsonb_object_keys(p_payload) k where k not in ('suggestion_id','action','reason','from_app','seq','day_key','at'))
  or jsonb_typeof(p_payload->'suggestion_id') is distinct from 'string' or length(p_payload->>'suggestion_id')=0 or octet_length(p_payload->>'suggestion_id')>200
  or jsonb_typeof(p_payload->'action') is distinct from 'string' or p_payload->>'action' not in ('start','skip','dismiss')
  or jsonb_typeof(p_payload->'reason') not in ('string','null') or octet_length(p_payload->>'reason')>4096
  or jsonb_typeof(p_payload->'from_app') is distinct from 'string' or p_payload->>'from_app'!~'^[a-z][a-z0-9_-]{0,63}$'
  or jsonb_typeof(p_payload->'seq') not in ('number','null')
  or jsonb_typeof(p_payload->'day_key') is distinct from 'string' or p_payload->>'day_key'!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  or jsonb_typeof(p_payload->'at') not in ('string','null') or octet_length(p_payload->>'at')>64 then
  raise exception 'invalid suggestion answer fields' using errcode='22023';end if;
 if p_payload->>'seq' is not null and ((p_payload->>'seq')::numeric<1 or (p_payload->>'seq')::numeric>9007199254740991
  or (p_payload->>'seq')::numeric<>trunc((p_payload->>'seq')::numeric)) then raise exception 'invalid event sequence' using errcode='22023';end if;
 begin
  day_value:=to_char((p_payload->>'day_key')::date,'YYYY-MM-DD');
  if day_value<>p_payload->>'day_key' then raise invalid_datetime_format;end if;
 exception when datetime_field_overflow or invalid_datetime_format then raise exception 'invalid logical day' using errcode='22023';end;
 sid:=p_payload->>'suggestion_id';action_value:=p_payload->>'action';reason_value:=nullif(btrim(p_payload->>'reason'),'');
 source_app:=p_payload->>'from_app';event_seq:=(p_payload->>'seq')::bigint;
 -- Same owner lock as task creation/structure; legacy writers still need cutover.
 perform pg_advisory_xact_lock(hashtextextended(actor::text,15015));
 select * into prior from ga_private.roadmap_answer_receipts where auth_user_id=actor and request_id=p_request_id;
 if found then
  if prior.payload<>p_payload then raise exception 'answer request changed' using errcode='22023';end if;
  replayed:=true;
 elsif event_seq is not null then
  select * into prior from ga_private.roadmap_answer_receipts where auth_user_id=actor and seq=event_seq;
  if found then
   -- A later device may use another local day. The first committed event fixes it.
   if (prior.payload-'day_key')<>(p_payload-'day_key') then raise exception 'event sequence changed' using errcode='22023';end if;
   replayed:=true;
  elsif exists(select from public.roadmap_suggestion_answers where user_id=actor and seq=event_seq) then
   -- Legacy rows have no evidence that their follow-up completed. Never invent a receipt.
   raise exception 'legacy answer requires reconciliation' using errcode='40001';
  end if;
 end if;
 if replayed then
  receipt_id:=prior.request_id;outcome_value:=prior.outcome;effect_value:=prior.effect;
 else
  -- Lock the optional task before its suggestion, matching structural deletion order.
  select rm_task_id into task_id from public.roadmap_suggestions where id=sid and user_id=actor;
  if task_id is not null then
   perform from public.roadmap_tasks where id=task_id and user_id=actor for update;
   if not found then raise exception 'suggestion task unavailable' using errcode='42501';end if;
  end if;
  select * into suggestion from public.roadmap_suggestions where id=sid and user_id=actor for update;
  if found and suggestion.rm_task_id is distinct from task_id then raise exception 'suggestion task changed' using errcode='40001';end if;
  insert into public.roadmap_suggestion_answers(user_id,seq,suggestion_id,from_app,action,reason,answered_at_app)
   values(actor,event_seq,sid,source_app,action_value,reason_value,p_payload->>'at') returning id into log_id;
  if log_id is null then raise exception 'answer log not saved' using errcode='40001';end if;
  outcome_value:=case when suggestion.id is null then 'unknown' when suggestion.answered_at is not null then 'already_answered' else 'applied' end;
  if outcome_value='applied' then
   if action_value='start' and task_id is not null then
    session_id:=public.roadmap_start_session(task_id,day_value,'roadmap');
    if session_id is null then raise exception 'session not saved' using errcode='40001';end if;
   end if;
   if action_value='skip' and reason_value is not null and suggestion.task->>'board_id' is distinct from 'rm' then
    if jsonb_typeof(suggestion.task)<>'object' or not suggestion.task ?& array['board_id','item_key','sub_id']
     or exists(select from jsonb_each(suggestion.task) e where e.key in ('board_id','item_key','sub_id') and (jsonb_typeof(e.value)<>'string' or e.value='""'::jsonb))
     or octet_length(suggestion.task::text)>4096 then raise exception 'review suggestion address' using errcode='22023';end if;
    effect_value:=jsonb_build_object('from_app','rm','to_app','wf','kind','task.skipped','src_addr',suggestion.task,
     'src_clock',null,'idempotency_key','rm:answer:'||p_request_id::text,
     'payload',suggestion.task||jsonb_build_object('reason',reason_value,'at',instant,'suggestion_id',sid));
   end if;
   update public.roadmap_suggestions set answer=action_value,reason=reason_value,answer_app=source_app,answered_at=instant,
    missed=(action_value='dismiss' or (action_value='skip' and reason_value is null)) where id=sid and user_id=actor;
   if not found then raise exception 'answer not applied' using errcode='40001';end if;
  end if;
  insert into ga_private.roadmap_answer_receipts(auth_user_id,request_id,seq,payload,outcome,effect)
   values(actor,p_request_id,event_seq,p_payload,outcome_value,effect_value) returning request_id into receipt_id;
  if receipt_id is null then raise exception 'answer receipt not saved' using errcode='40001';end if;
 end if;
 select to_jsonb(s) into current_suggestion from public.roadmap_suggestions s where id=sid and user_id=actor;
 return jsonb_build_object('request_id',p_request_id,'receipt_id',receipt_id,'replayed',replayed,
  'outcome',outcome_value,'effect',effect_value,'suggestion',current_suggestion);
end $$;
revoke all on function public.ga_roadmap_answer_suggestion(jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.ga_roadmap_answer_suggestion(jsonb,uuid) to authenticated;
commit;
