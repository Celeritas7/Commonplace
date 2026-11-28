-- REVIEW CANDIDATE ONLY. Requires 17/20/21 and their reviewed dependencies.
-- Owner-authorized request receipts; app strings do not attest the sender.
-- Coordinated prepared-client cutover required. No hosted installation authorized.
begin;
set local search_path=pg_catalog,public;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.akatsuki_requests,public.akatsuki_links,public.akatsuki_cursors,
 public.roadmap_suggestions,public.roadmap_suggestion_answers,public.roadmap_study_sessions in access exclusive mode;
lock table ga_private.roadmap_control,ga_private.roadmap_answer_receipts,
 ga_private.roadmap_study_report_receipts,ga_private.roadmap_study_report_pairs,ga_private.roadmap_study_sources in share mode;
do $$ declare expected record; relation regclass; begin
 if not exists(select from ga_private.roadmap_control where id and not paused) then raise exception 'review Roadmap control';end if;
 for expected in select * from (values
  ('akatsuki_requests','d859af562b848ed64ed6deeaf3900a6b','bdd73d58944c8fa9175cb65555163bad'),
  ('akatsuki_links','e58a695eede985cd1f0ad56c17444446','85a91168f3879ed50aab83c7d32ac69e'),
  ('akatsuki_cursors','14420495a085b480fcfe1dc9450a060a','029578ea1976d38c3982c17a0a0e6d8a'),
  ('roadmap_suggestions','b856cfbe3cc4fddc75f2f582a6263c89','f613f7151e3e3fc883fb847840533bc7'),
  ('roadmap_suggestion_answers','79d191986811090160fe2205d778e889','1f0bff451b876cbb35e5eb283609c54c'),
  ('roadmap_study_sessions','dde0138728990ecc7a2196e0d43ced68','3f4cb5667abe460795f38b6ae091375b')
 ) t(tbl,columns_hash,constraints_hash) loop
  relation:=format('public.%I',expected.tbl)::regclass;
  if not exists(select from pg_class where oid=relation and relkind='r' and relrowsecurity and pg_get_userbyid(relowner)='postgres')
   or (select md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull::text||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),''),'|' order by a.attnum))
    from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=relation and a.attnum>0 and not a.attisdropped) is distinct from expected.columns_hash
   or (select md5(string_agg(conname||':'||pg_get_constraintdef(oid)||':'||convalidated,E'\n' order by conname)) from pg_constraint where conrelid=relation) is distinct from expected.constraints_hash
   or exists(select from pg_trigger where tgrelid=relation and not tgisinternal)
   or (select count(*) from pg_policies where schemaname='public' and tablename=expected.tbl)<>1
   or not exists(select from pg_policies where schemaname='public' and tablename=expected.tbl and cmd='ALL' and roles='{authenticated}'
    and permissive='PERMISSIVE' and qual='(user_id = auth.uid())' and with_check=qual) then raise exception 'review hub protocol baseline: %',expected.tbl;end if;
 end loop;
 for expected in select * from (values
  ('public.ga_roadmap_answer_suggestion(jsonb,uuid)','1fa15e20dcfa7904309936a7f142117e'),
  ('public.ga_roadmap_receive_study_report(bigint)','91110bf2f842397f2895e5cd6baf4e81')
 ) t(signature,body_hash) loop
  if not exists(select from pg_proc where oid=expected.signature::regprocedure and prosecdef and pg_get_userbyid(proowner)='postgres'
   and proconfig=array['search_path=""','TimeZone=UTC'] and md5(replace(prosrc,chr(13),''))=expected.body_hash) then
   raise exception 'review consumer dependency: %',expected.signature;end if;
 end loop;
 if not exists(select from pg_proc where oid='ga_private.roadmap_hub_evidence(public.akatsuki_requests)'::regprocedure
  and not prosecdef and pg_get_userbyid(proowner)='postgres' and proconfig=array['search_path=""']
  and md5(replace(prosrc,chr(13),''))='d25a403fa4be670ca191e86a3dc8b081') then raise exception 'review candidate 21 evidence';end if;
end $$;

-- These private records are the authority for application/replay. Refuse new
-- policies, triggers, client grants or schema drift before relying on them.
do $$ declare expected record;relation regclass;role_name text;begin
 for expected in select * from (values
  ('roadmap_answer_receipts','5d29b9bc15ef0eb62fbf1ab6f457d58f','7537efa9f306b99962756c61d7a91751'),
  ('roadmap_study_report_receipts','4a98444a77a8aeb2b97aa53d7c469106','939fc7e156a88c305b4678fb729f097a'),
  ('roadmap_study_report_pairs','1cb2168274850006cb69fcc38de34455','a4cc0619fd7e7570c49cce04405bad7e'),
  ('roadmap_study_sources','334d87a8928e3968d10cf28f54e95cfa','a80ba117a4116ba6dce2c0d4c7c08de4')
 ) t(tbl,columns_hash,constraints_hash) loop
  relation:=format('ga_private.%I',expected.tbl)::regclass;
  if not exists(select from pg_class where oid=relation and relkind='r' and relrowsecurity and pg_get_userbyid(relowner)='postgres')
   or (select md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull::text||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),''),'|' order by a.attnum))
    from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=relation and a.attnum>0 and not a.attisdropped) is distinct from expected.columns_hash
   or (select md5(string_agg(conname||':'||pg_get_constraintdef(oid)||':'||convalidated,E'\n' order by conname)) from pg_constraint where conrelid=relation) is distinct from expected.constraints_hash
   or exists(select from pg_trigger where tgrelid=relation and not tgisinternal)
   or exists(select from pg_policy where polrelid=relation) then raise exception 'review private consumer receipt: %',expected.tbl;end if;
  foreach role_name in array array['anon','authenticated','service_role'] loop
   if has_table_privilege(role_name,relation,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
    raise exception 'review private consumer grant: %',expected.tbl;end if;
  end loop;
 end loop;
 if not exists(select from pg_proc where oid='public.roadmap_start_session(uuid,text,text)'::regprocedure and prosecdef
  and pg_get_userbyid(proowner)='postgres' and proconfig=array['search_path=""']
  and md5(replace(prosrc,chr(13),''))='e50d41426322e7c7d727cd5ad4f8b12b') then raise exception 'review candidate 03 session routine';end if;
end $$;

-- Separate, empty gate for each owner/source/kind. Mirror access does not enable
-- suggestions or study reports. Study-source review from candidate 20 is also required.
create table ga_private.roadmap_consumer_access(
 auth_user_id uuid not null,from_app text not null,kind text not null check(kind in ('suggestion.answered','session.completed')),
 enabled boolean not null default false,review_ref text not null check(length(btrim(review_ref))>0),primary key(auth_user_id,from_app,kind)
);
create table ga_private.roadmap_consumer_received(
 auth_user_id uuid not null,seq bigint not null,evidence jsonb not null,receipt_id uuid,
 outcome text not null,effect jsonb,received_at timestamptz not null default now(),primary key(auth_user_id,seq)
);
create table ga_private.roadmap_consumer_acknowledged(
 auth_user_id uuid not null,seq bigint not null,result jsonb not null,acknowledged_at timestamptz not null default now(),
 primary key(auth_user_id,seq),foreign key(auth_user_id,seq) references ga_private.roadmap_consumer_received(auth_user_id,seq)
);
alter table ga_private.roadmap_consumer_access enable row level security;
alter table ga_private.roadmap_consumer_received enable row level security;
alter table ga_private.roadmap_consumer_acknowledged enable row level security;
revoke all on ga_private.roadmap_consumer_access,ga_private.roadmap_consumer_received,ga_private.roadmap_consumer_acknowledged from public,anon,authenticated,service_role;

create function ga_private.roadmap_consumer_event(p_seq bigint,p_kind text) returns public.akatsuki_requests
language plpgsql set search_path='' as $$
declare actor uuid:=auth.uid();event public.akatsuki_requests;received ga_private.roadmap_consumer_received;ack ga_private.roadmap_consumer_acknowledged;
begin
 perform from ga_private.roadmap_control where id and not paused for share;
 if not found then raise exception 'consumer access denied' using errcode='42501';end if;
 perform from auth.users where id=actor and email_confirmed_at is not null and is_anonymous is false
  and coalesce(auth.jwt()->>'is_anonymous','false')='false' for share;
 if not found then raise exception 'consumer access denied' using errcode='42501';end if;
 if p_seq is null or p_seq<1 or p_seq>9007199254740991 then raise exception 'invalid consumer sequence' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,15015));
 select * into event from public.akatsuki_requests where seq=p_seq and user_id=actor for update;
 if not found then raise exception 'consumer event unavailable' using errcode='42501';end if;
 if event.to_app<>'rm' or event.kind not in ('suggestion.answered','session.completed') or p_kind is not null and event.kind<>p_kind then
  raise exception 'unexpected consumer event contract' using errcode='22023';end if;
 perform from ga_private.roadmap_consumer_access where auth_user_id=actor and from_app=event.from_app and kind=event.kind and enabled for share;
 if not found then raise exception 'consumer source review required' using errcode='42501';end if;
 if event.kind='session.completed' then
  perform from ga_private.roadmap_study_sources where auth_user_id=actor and from_app=event.from_app and enabled
   and from_app='jlpt' and source='japanese-study-app-advanced' for share;
  if not found then raise exception 'study caller review required' using errcode='42501';end if;
 end if;
 select * into received from ga_private.roadmap_consumer_received where auth_user_id=actor and seq=p_seq;
 if found and received.evidence is distinct from ga_private.roadmap_hub_evidence(event) then raise exception 'consumer evidence changed' using errcode='40001';end if;
 select * into ack from ga_private.roadmap_consumer_acknowledged where auth_user_id=actor and seq=p_seq;
 if found then
  if event.status<>'delivered' or event.reply is distinct from ack.result->'reply'
   or to_jsonb(event.reply_seq) is distinct from ack.result->'reply_seq' then raise exception 'consumer acknowledgement changed' using errcode='40001';end if;
 elsif event.status<>'pending' or event.reply is not null or event.reply_seq is not null then
  raise exception 'legacy consumer state requires reconciliation' using errcode='40001';
 end if;
 return event;
end $$;

-- Keep native answers available under an explicit local-only API. The old
-- payload/sequence API becomes a private implementation dependency at cutover.
create function public.ga_roadmap_answer_local_suggestion(p_payload jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
begin
 if p_payload->'seq' is distinct from 'null'::jsonb or p_payload->>'from_app' is distinct from 'rm' then
  raise exception 'use the original stored suggestion event' using errcode='22023';end if;
 return public.ga_roadmap_answer_suggestion(p_payload,p_request_id);
end $$;

create function public.ga_roadmap_receive_suggestion_event(p_seq bigint,p_request_id uuid,p_day_key text) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=auth.uid();event public.akatsuki_requests;received ga_private.roadmap_consumer_received;
 payload jsonb;answer jsonb;result jsonb;vocabulary jsonb;reason_value text;
begin
 event:=ga_private.roadmap_consumer_event(p_seq,'suggestion.answered');payload:=event.payload;
 select schema into vocabulary from public.akatsuki_vocab where user_id=actor and ns='kind' and id='suggestion.answered' for share;
 if vocabulary is distinct from '{"required":["suggestion_id","action","at","app"],"optional":["reason"]}'::jsonb then
  raise exception 'review suggestion vocabulary' using errcode='40001';end if;
 select schema into vocabulary from public.akatsuki_vocab where user_id=actor and ns='enum' and id='answer_action' for share;
 if vocabulary is distinct from '{"values":["start","skip","dismiss"]}'::jsonb then raise exception 'review suggestion actions' using errcode='40001';end if;
 if jsonb_typeof(payload)<>'object' or octet_length(payload::text)>16384 or not payload ?& array['suggestion_id','action','at','app']
  or exists(select from jsonb_object_keys(payload) k where k not in ('suggestion_id','action','at','app','reason'))
  or jsonb_typeof(event.src_addr)<>'object' or octet_length(event.src_addr::text)>4096
  or event.src_addr->'suggestion_id' is distinct from payload->'suggestion_id'
  or payload->>'app' is distinct from event.from_app or event.from_app='rm'
  or jsonb_typeof(payload->'at') is distinct from 'string'
  or event.idempotency_key is distinct from event.from_app||':ans:'||(payload->>'suggestion_id')
  or octet_length(event.idempotency_key)>280 or octet_length(event.src_clock)>200
  or payload ? 'reason' and jsonb_typeof(payload->'reason') not in ('string','null') then
  raise exception 'invalid stored suggestion event' using errcode='22023';end if;
 -- Match ECMAScript trim used by the saved client, including Unicode spaces.
 reason_value:=nullif(btrim(payload->>'reason',E' \t\n\r\f\v\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'),'');
 answer:=jsonb_build_object('suggestion_id',payload->'suggestion_id','action',payload->'action','reason',reason_value,
  'from_app',event.from_app,'seq',p_seq,'day_key',p_day_key,'at',payload->'at');
 select * into received from ga_private.roadmap_consumer_received where auth_user_id=actor and seq=p_seq;
 if not found and exists(select from ga_private.roadmap_answer_receipts where auth_user_id=actor and (seq=p_seq or request_id=p_request_id)) then
  raise exception 'legacy answer receipt requires reconciliation' using errcode='40001';end if;
 result:=public.ga_roadmap_answer_suggestion(answer,p_request_id);
 if received.seq is null then
  insert into ga_private.roadmap_consumer_received(auth_user_id,seq,evidence,receipt_id,outcome,effect)
   values(actor,p_seq,ga_private.roadmap_hub_evidence(event),(result->>'receipt_id')::uuid,result->>'outcome',result->'effect');
  if not found then raise exception 'consumer receive receipt not saved' using errcode='40001';end if;
 elsif received.receipt_id is distinct from (result->>'receipt_id')::uuid or received.outcome is distinct from result->>'outcome'
  or received.effect is distinct from result->'effect' then raise exception 'consumer answer receipt changed' using errcode='40001';end if;
 return result||jsonb_build_object('seq',p_seq,'kind',event.kind,'from_app',event.from_app,'to_app',event.to_app,'answer',answer);
end $$;

create function public.ga_roadmap_receive_study_event(p_seq bigint) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=auth.uid();event public.akatsuki_requests;received ga_private.roadmap_consumer_received;result jsonb;
begin
 event:=ga_private.roadmap_consumer_event(p_seq,'session.completed');
 select * into received from ga_private.roadmap_consumer_received where auth_user_id=actor and seq=p_seq;
 if not found and exists(select from ga_private.roadmap_study_report_receipts where auth_user_id=actor and seq=p_seq) then
  raise exception 'legacy study receipt requires reconciliation' using errcode='40001';end if;
 result:=public.ga_roadmap_receive_study_report(p_seq);
 if received.seq is null then
  insert into ga_private.roadmap_consumer_received(auth_user_id,seq,evidence,outcome)
   values(actor,p_seq,ga_private.roadmap_hub_evidence(event),result->>'outcome');
  if not found then raise exception 'consumer receive receipt not saved' using errcode='40001';end if;
 end if;
 return result||jsonb_build_object('kind',event.kind,'from_app',event.from_app,'to_app',event.to_app,'receipt_outcome',coalesce(received.outcome,result->>'outcome'));
end $$;

-- No browser address, target, reply or status. Receipt, exact outgoing effect,
-- original event, cursor and terminal reply are checked/committed together.
create function public.ga_roadmap_ack_consumer_event(p_seq bigint) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=auth.uid();event public.akatsuki_requests;after_event public.akatsuki_requests;outgoing public.akatsuki_requests;
 received ga_private.roadmap_consumer_received;prior ga_private.roadmap_consumer_acknowledged;
 answer ga_private.roadmap_answer_receipts;study ga_private.roadmap_study_report_receipts;
 reply_value jsonb;reply_number bigint;result jsonb;cursor_seq bigint;task uuid;
begin
 event:=ga_private.roadmap_consumer_event(p_seq,null);
 select * into received from ga_private.roadmap_consumer_received where auth_user_id=actor and seq=p_seq;
 if not found then raise exception 'receive original event before acknowledgement' using errcode='40001';end if;
 select * into prior from ga_private.roadmap_consumer_acknowledged where auth_user_id=actor and seq=p_seq;
 if event.kind='suggestion.answered' then
  select * into answer from ga_private.roadmap_answer_receipts where auth_user_id=actor and seq=p_seq and request_id=received.receipt_id;
  if not found or answer.outcome is distinct from received.outcome or coalesce(answer.effect,'null'::jsonb) is distinct from received.effect then
   raise exception 'answer application receipt changed' using errcode='40001';end if;
  -- A present suggestion/task must still belong to this owner. Missing rows are
  -- retained history; no acknowledgement ever recreates them.
  select rm_task_id into task from public.roadmap_suggestions where id=answer.payload->>'suggestion_id' and user_id=actor for share;
  if not found and answer.outcome<>'unknown' and exists(select from public.roadmap_suggestions where id=answer.payload->>'suggestion_id') then
   raise exception 'suggestion owner changed' using errcode='42501';end if;
  if task is not null then
   perform from public.roadmap_tasks where id=task and user_id=actor for share;
   if not found then raise exception 'suggestion task unavailable' using errcode='42501';end if;
  end if;
  if received.effect is distinct from 'null'::jsonb then
   select * into outgoing from public.akatsuki_requests where user_id=actor and idempotency_key=received.effect->>'idempotency_key' for share;
   if not found or ga_private.roadmap_hub_evidence(outgoing) is distinct from received.effect
    or prior.seq is null and (outgoing.status not in ('pending','delivered') or outgoing.reply is not null and coalesce(outgoing.reply->>'status','') not in ('applied','already')) then raise exception 'original follow-up publication not confirmed' using errcode='40001';end if;
  end if;
 else
  select * into study from ga_private.roadmap_study_report_receipts where auth_user_id=actor and seq=p_seq;
  if not found or study.outcome is distinct from received.outcome then raise exception 'study application receipt changed' using errcode='40001';end if;
  perform from public.roadmap_tasks where id=study.task_id and user_id=actor for share;
  if not found then raise exception 'study task unavailable' using errcode='42501';end if;
 end if;
 if prior.seq is not null then return prior.result||jsonb_build_object('replayed',true);end if;
 reply_value:=jsonb_build_object('protocol','roadmap.consumer.v1','request_seq',p_seq,'kind',event.kind,'status',received.outcome);
 reply_number:=nextval('public.akatsuki_seq');
 if reply_number<1 or reply_number>9007199254740991 then raise exception 'unsafe reply sequence' using errcode='22023';end if;
 update public.akatsuki_requests set status='delivered',delivered_at=now(),next_try_at=null,reply=reply_value,reply_seq=reply_number
  where user_id=actor and seq=p_seq and status='pending' returning * into after_event;
 if not found or after_event.status<>'delivered' or after_event.reply is distinct from reply_value or after_event.reply_seq is distinct from reply_number
  or ga_private.roadmap_hub_evidence(after_event) is distinct from received.evidence then raise exception 'consumer acknowledgement not saved' using errcode='40001';end if;
 insert into public.akatsuki_cursors(user_id,app,last_seq) values(actor,'rm',p_seq)
  on conflict(user_id,app) do update set last_seq=greatest(public.akatsuki_cursors.last_seq,excluded.last_seq),updated_at=now() returning last_seq into cursor_seq;
 if not found or cursor_seq<p_seq then raise exception 'consumer cursor not saved' using errcode='40001';end if;
 result:=jsonb_build_object('seq',p_seq,'kind',event.kind,'status','delivered','reply',reply_value,'reply_seq',reply_number,'replayed',false);
 insert into ga_private.roadmap_consumer_acknowledged(auth_user_id,seq,result) values(actor,p_seq,result);
 if not found then raise exception 'consumer acknowledgement receipt not saved' using errcode='40001';end if;
 return result;
end $$;
-- Producers may check the private receipt. A legacy caller setting a public
-- request to delivered is insufficient proof and is rejected by the helper.
create function public.ga_roadmap_consumer_status(p_seq bigint) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare event public.akatsuki_requests;receipt ga_private.roadmap_consumer_acknowledged;
begin
 event:=ga_private.roadmap_consumer_event(p_seq,null);
 select * into receipt from ga_private.roadmap_consumer_acknowledged where auth_user_id=auth.uid() and seq=p_seq;
 if found then return receipt.result||jsonb_build_object('replayed',true);end if;
 return jsonb_build_object('seq',p_seq,'kind',event.kind,'status','pending');
end $$;
revoke all on function ga_private.roadmap_consumer_event(bigint,text) from public,anon,authenticated,service_role;
revoke all on function public.ga_roadmap_answer_suggestion(jsonb,uuid),public.ga_roadmap_receive_study_report(bigint) from public,anon,authenticated,service_role;
revoke all on function public.ga_roadmap_answer_local_suggestion(jsonb,uuid),public.ga_roadmap_receive_suggestion_event(bigint,uuid,text),
 public.ga_roadmap_receive_study_event(bigint),public.ga_roadmap_ack_consumer_event(bigint),public.ga_roadmap_consumer_status(bigint) from public,anon,authenticated,service_role;
grant execute on function public.ga_roadmap_answer_local_suggestion(jsonb,uuid),public.ga_roadmap_receive_suggestion_event(bigint,uuid,text),
 public.ga_roadmap_receive_study_event(bigint),public.ga_roadmap_ack_consumer_event(bigint),public.ga_roadmap_consumer_status(bigint) to authenticated;
notify pgrst,'reload schema';
commit;
