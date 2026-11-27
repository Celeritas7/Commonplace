-- REVIEW CANDIDATE ONLY. Requires 01/03/09/15/18 and a reviewed hub catalog.
-- No hosted installation, route registration or deployment. Private access starts empty.
begin;
set local search_path=pg_catalog,public;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.roadmap_tasks,public.roadmap_suggestions in access exclusive mode;
lock table ga_private.roadmap_control,ga_private.roadmap_mirror_pairs in share mode;
do $$ declare expected record; relation regclass; begin
 if not exists(select from ga_private.roadmap_control where id and not paused) then raise exception 'review Roadmap control';end if;
 for expected in select * from (values
  ('roadmap_tasks','eb99159acb9018231039d6f9a56099b8','7f5547fc577c69982d59b02eebde7def','6e5ad134423e598a1d667c79425df4ae'),
  ('roadmap_suggestions','b856cfbe3cc4fddc75f2f582a6263c89','f613f7151e3e3fc883fb847840533bc7','d41d8cd98f00b204e9800998ecf8427e')
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
   raise exception 'review completion record baseline: %',expected.tbl;
  end if;
 end loop;
 if not exists(select from pg_proc where oid='public.roadmap_set_updated_at()'::regprocedure and not prosecdef
  and pg_get_userbyid(proowner)='postgres' and md5(replace(prosrc,chr(13),''))='9b1889f56258bf9d6554213c05019c76') then raise exception 'review task timestamp trigger';end if;
 if not exists(select from pg_proc where oid='public.ga_roadmap_receive_task(jsonb,jsonb,bigint)'::regprocedure
  and prosecdef and pg_get_userbyid(proowner)='postgres' and md5(replace(prosrc,chr(13),''))='42318e7574f9fc516b193a9207722899') then raise exception 'review candidate 18';end if;
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

create table ga_private.roadmap_completion_access(auth_user_id uuid primary key,enabled boolean not null default false,review_ref text not null check(length(btrim(review_ref))>0));
create table ga_private.roadmap_done_requests(
 auth_user_id uuid not null,request_id uuid not null,task_id uuid not null,suggestion_id text,
 effect jsonb not null,last_reply_seq bigint not null default 0,last_reply jsonb,outcome text,
 closed boolean not null default false,created_at timestamptz not null default now(),
 primary key(auth_user_id,request_id)
);
create unique index roadmap_one_pending_done on ga_private.roadmap_done_requests(auth_user_id,task_id) where not closed;
create table ga_private.roadmap_done_aliases(
 auth_user_id uuid not null,request_id uuid not null,canonical_id uuid not null,task_id uuid not null,suggestion_id text,
 primary key(auth_user_id,request_id),foreign key(auth_user_id,canonical_id) references ga_private.roadmap_done_requests(auth_user_id,request_id)
);
create table ga_private.roadmap_done_receipts(
 auth_user_id uuid not null,reply_seq bigint not null,request_id uuid not null,hub_seq bigint not null,reply jsonb not null,outcome text not null,
 created_at timestamptz not null default now(),primary key(auth_user_id,reply_seq)
);
alter table ga_private.roadmap_completion_access enable row level security;
alter table ga_private.roadmap_done_requests enable row level security;
alter table ga_private.roadmap_done_receipts enable row level security;
alter table ga_private.roadmap_done_aliases enable row level security;
revoke all on ga_private.roadmap_completion_access,ga_private.roadmap_done_requests,ga_private.roadmap_done_receipts,ga_private.roadmap_done_aliases from public,anon,authenticated,service_role;
-- A reply and a task.upsert share the hub clock. Neither may undo a later effect.
alter table ga_private.roadmap_mirror_pairs add column effect_seq bigint not null default 0;
update ga_private.roadmap_mirror_pairs set effect_seq=last_seq;

create function ga_private.roadmap_completion_actor() returns uuid language plpgsql set search_path='' as $$
declare actor uuid:=auth.uid(); vocabulary jsonb; begin
 perform from ga_private.roadmap_control where id and not paused for share;
 if not found then raise exception 'completion access denied' using errcode='42501';end if;
 perform from auth.users where id=actor and email_confirmed_at is not null and is_anonymous is false and coalesce(auth.jwt()->>'is_anonymous','false')='false' for share;
 if not found then raise exception 'completion access denied' using errcode='42501';end if;
 perform from ga_private.roadmap_mirror_access where auth_user_id=actor and enabled for share;
 if not found then raise exception 'completion reconciliation required' using errcode='42501';end if;
 perform from ga_private.roadmap_completion_access where auth_user_id=actor and enabled for share;
 if not found then raise exception 'completion reconciliation required' using errcode='42501';end if;
 select schema->'values' into vocabulary from public.akatsuki_vocab where user_id=actor and ns='enum' and id='wf_apply_status' for share;
 if vocabulary is null or jsonb_typeof(vocabulary)<>'array' or jsonb_array_length(vocabulary)<>4 or not vocabulary @> '["applied","already","unknown","stale"]' then
  raise exception 'review completion reply vocabulary' using errcode='40001';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,15015));return actor;
end $$;
revoke all on function ga_private.roadmap_completion_actor() from public,anon,authenticated,service_role;

create function public.ga_roadmap_prepare_done(p_task_id uuid,p_request_id uuid,p_suggestion_id text default null)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=ga_private.roadmap_completion_actor();saved ga_private.roadmap_done_requests;alias_row ga_private.roadmap_done_aliases;pair ga_private.roadmap_mirror_pairs;effect_value jsonb;publishable boolean;
begin
 if p_task_id is null or p_request_id is null or p_suggestion_id is not null and (length(p_suggestion_id)=0 or octet_length(p_suggestion_id)>200) then raise exception 'invalid completion request' using errcode='22023';end if;
 select * into alias_row from ga_private.roadmap_done_aliases where auth_user_id=actor and request_id=p_request_id;
 if found then
  if alias_row.task_id<>p_task_id or alias_row.suggestion_id is distinct from p_suggestion_id then raise exception 'completion request changed' using errcode='22023';end if;
  select * into saved from ga_private.roadmap_done_requests where auth_user_id=actor and request_id=alias_row.canonical_id;
  if not found then raise exception 'completion alias requires review' using errcode='40001';end if;
 else
  select * into saved from ga_private.roadmap_done_requests where auth_user_id=actor and task_id=p_task_id and not closed;
  if not found then
   select * into pair from ga_private.roadmap_mirror_pairs where auth_user_id=actor and task_id=p_task_id and not suppressed and not source_deleted for update;
   if not found then raise exception 'completion task unavailable' using errcode='42501';end if;
   perform from public.roadmap_tasks where user_id=actor and id=p_task_id and kind='task' for update;
   if not found then raise exception 'completion task unavailable' using errcode='42501';end if;
   if p_suggestion_id is not null then
    perform from public.roadmap_suggestions where id=p_suggestion_id and user_id=actor and rm_task_id=p_task_id and task=pair.address for update;
    if not found then raise exception 'completion suggestion unavailable' using errcode='42501';end if;
   end if;
   effect_value:=jsonb_build_object('from_app','rm','to_app','wf','kind','task.done','src_addr',pair.address,'src_clock',null,
    'idempotency_key','rm:done:'||p_request_id::text,'payload',pair.address||jsonb_build_object('at',now(),'suggestion_id',p_suggestion_id));
   insert into ga_private.roadmap_done_requests(auth_user_id,request_id,task_id,suggestion_id,effect) values(actor,p_request_id,p_task_id,p_suggestion_id,effect_value) returning * into saved;
   if not found then raise exception 'completion request not saved' using errcode='40001';end if;
  end if;
  insert into ga_private.roadmap_done_aliases values(actor,p_request_id,saved.request_id,p_task_id,p_suggestion_id);
  if not found then raise exception 'completion alias not saved' using errcode='40001';end if;
 end if;
 -- Retain recovery evidence after removal, but never authorize a new publish.
 select exists(select from ga_private.roadmap_mirror_pairs p join public.roadmap_tasks t on t.id=p.task_id and t.user_id=p.auth_user_id
  where p.auth_user_id=actor and p.task_id=saved.task_id and not p.suppressed and not p.source_deleted) into publishable;
 return jsonb_build_object('requested_id',p_request_id,'request_id',saved.request_id,'task_id',saved.task_id,'effect',saved.effect,'closed',saved.closed,'publishable',publishable);

end $$;

create function public.ga_roadmap_reconcile_done(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=ga_private.roadmap_completion_actor();saved ga_private.roadmap_done_requests;event public.akatsuki_requests;
 pair ga_private.roadmap_mirror_pairs;row public.roadmap_tasks;prior ga_private.roadmap_done_receipts;status_value text;outcome_value text;tasks jsonb:='[]';
begin
 if p_request_id is null then raise exception 'invalid completion request' using errcode='22023';end if;
 select * into saved from ga_private.roadmap_done_requests where auth_user_id=actor and request_id=p_request_id for update;
 if not found then raise exception 'completion request unavailable' using errcode='42501';end if;
 -- Read the owner's actual hub row. The browser cannot supply a reply, cursor or target.
 select * into event from public.akatsuki_requests where user_id=actor and idempotency_key=saved.effect->>'idempotency_key' for share;
 if not found then return jsonb_build_object('request_id',saved.request_id,'task_id',saved.task_id,'state','unpublished','reply_seq',0,'tasks','[]'::jsonb,'suggestion',null);end if;
 if event.from_app<>'rm' or event.to_app<>'wf' or event.kind<>'task.done' or event.src_addr<>saved.effect->'src_addr' or event.payload<>saved.effect->'payload'
  or event.seq<1 or event.seq>9007199254740991 then raise exception 'hub completion request differs' using errcode='40001';end if;
 if event.reply is null then
  if saved.last_reply_seq<>0 then raise exception 'hub completion reply disappeared' using errcode='40001';end if;
  return jsonb_build_object('request_id',saved.request_id,'task_id',saved.task_id,'state','pending','reply_seq',0,'tasks','[]'::jsonb,'suggestion',null);
 end if;
 if event.reply_seq is null or event.reply_seq<=event.seq or event.reply_seq>9007199254740991 or jsonb_typeof(event.reply)<>'object' or octet_length(event.reply::text)>16384
  or jsonb_typeof(event.reply->'status') is distinct from 'string' or event.reply->>'status' not in ('applied','already','unknown','stale') then
  raise exception 'review completion reply' using errcode='40001';end if;
 status_value:=event.reply->>'status';
 select * into pair from ga_private.roadmap_mirror_pairs where auth_user_id=actor and task_id=saved.task_id for update;
 if not found or pair.address<>event.src_addr then raise exception 'completion pairing requires review' using errcode='40001';end if;
 select * into row from public.roadmap_tasks where user_id=actor and id=saved.task_id for update;
 if not found and exists(select from public.roadmap_tasks where id=saved.task_id) then raise exception 'completion task unavailable' using errcode='42501';end if;
 select * into prior from ga_private.roadmap_done_receipts where auth_user_id=actor and reply_seq=event.reply_seq;
 if found then
  if prior.request_id<>saved.request_id or prior.hub_seq<>event.seq or prior.reply<>event.reply then raise exception 'completion reply changed' using errcode='40001';end if;
  outcome_value:=prior.outcome;
 else
  if event.reply_seq<=saved.last_reply_seq then raise exception 'completion reply moved backwards' using errcode='40001';end if;
  outcome_value:=case when row.id is null or pair.suppressed then 'removed' when pair.effect_seq>=event.reply_seq then 'superseded' else status_value end;
  if outcome_value in ('applied','already','unknown') then
   if outcome_value='unknown' then
    update public.roadmap_tasks set tags=array(select distinct x from unnest(coalesce(tags,'{}')||array['wf','orphaned']) x) where id=row.id and user_id=actor returning * into row;
    pair.source_deleted:=true;
   else
    update public.roadmap_tasks set done=true where id=row.id and user_id=actor returning * into row;
   end if;
   if not found then raise exception 'completion task not saved' using errcode='40001';end if;
   if outcome_value in ('applied','already') and saved.suggestion_id is not null then
    perform from public.roadmap_suggestions where id=saved.suggestion_id and user_id=actor and rm_task_id=saved.task_id and task=pair.address for update;
    if found then
     update public.roadmap_suggestions set done_at=coalesce(done_at,now()) where id=saved.suggestion_id and user_id=actor;
     if not found then raise exception 'completion suggestion not saved' using errcode='40001';end if;
    elsif exists(select from public.roadmap_suggestions where id=saved.suggestion_id) then raise exception 'completion suggestion unavailable' using errcode='42501';end if;
   end if;
   update ga_private.roadmap_mirror_pairs set effect_seq=event.reply_seq,source_deleted=pair.source_deleted where auth_user_id=actor and task_id=saved.task_id;
   if not found then raise exception 'completion effect not saved' using errcode='40001';end if;
  end if;
  insert into ga_private.roadmap_done_receipts(auth_user_id,reply_seq,request_id,hub_seq,reply,outcome) values(actor,event.reply_seq,saved.request_id,event.seq,event.reply,outcome_value);
  if not found then raise exception 'completion receipt not saved' using errcode='40001';end if;
  update ga_private.roadmap_done_requests set last_reply_seq=event.reply_seq,last_reply=event.reply,outcome=outcome_value,closed=true where auth_user_id=actor and request_id=saved.request_id;
  if not found then raise exception 'completion acknowledgement not saved' using errcode='40001';end if;
 end if;
 if row.id is not null and not pair.suppressed then tasks:=jsonb_build_array(to_jsonb(row)-'user_id');end if;
 return jsonb_build_object('request_id',saved.request_id,'task_id',saved.task_id,'state',outcome_value,'reply_seq',event.reply_seq,'tasks',tasks,'suggestion',
  (select jsonb_build_object('id',s.id,'task_id',s.rm_task_id,'done_at',s.done_at) from public.roadmap_suggestions s where s.user_id=actor and s.id=saved.suggestion_id and s.rm_task_id=saved.task_id));
end $$;

-- Per-request discovery avoids one shared high-water cursor skipping a late reply.
-- This does not adopt any legacy daily-key request, skip reply or unscoped outbox.
create function public.ga_roadmap_done_recovery() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=ga_private.roadmap_completion_actor();result jsonb;begin
 select coalesce(jsonb_agg(x.value order by x.reply_seq nulls last,x.created_at,x.request_id),'[]') into result from (
  select jsonb_build_object('request_id',r.request_id,'task_id',r.task_id,'suggestion_id',r.suggestion_id) value,h.reply_seq,r.created_at,r.request_id
  from ga_private.roadmap_done_requests r left join public.akatsuki_requests h on h.user_id=r.auth_user_id and h.idempotency_key=r.effect->>'idempotency_key'
  where r.auth_user_id=actor and (not r.closed or h.reply_seq>r.last_reply_seq)
  order by h.reply_seq nulls last,r.created_at,r.request_id limit 100
 ) x;return result;
end $$;
revoke all on function public.ga_roadmap_prepare_done(uuid,uuid,text),public.ga_roadmap_reconcile_done(uuid),public.ga_roadmap_done_recovery() from public,anon,authenticated,service_role;
grant execute on function public.ga_roadmap_prepare_done(uuid,uuid,text),public.ga_roadmap_reconcile_done(uuid),public.ga_roadmap_done_recovery() to authenticated;

-- Candidate 18 successor: task.upsert respects completion reply ordering.
create or replace function public.ga_roadmap_receive_task(p_address jsonb,p_payload jsonb,p_seq bigint)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=auth.uid();pair ga_private.roadmap_mirror_pairs;receipt ga_private.roadmap_mirror_receipts;
 row public.roadmap_tasks;folder public.roadmap_tasks;address_key text;title_value text;project_value text;
 label text;labels text[];folders uuid[];task_identity uuid;folder_identity uuid;ignored jsonb;
 replayed boolean;pair_exists boolean;rows jsonb:='[]';was_deleted boolean;new_done boolean;
begin
 perform from ga_private.roadmap_control where id and not paused for share;
 if not found then raise exception 'mirror access denied' using errcode='42501';end if;
 perform from auth.users where id=actor and email_confirmed_at is not null and is_anonymous is false
  and coalesce(auth.jwt()->>'is_anonymous','false')='false' for share;
 if not found then raise exception 'mirror access denied' using errcode='42501';end if;
 perform from ga_private.roadmap_mirror_access where auth_user_id=actor and enabled for share;
 if not found then raise exception 'mirror reconciliation required' using errcode='42501';end if;
 if p_seq is null or p_seq<1 or p_seq>9007199254740991 or p_address is null or jsonb_typeof(p_address)<>'object'
  or octet_length(p_address::text)>4096 or not p_address ?& array['board_id','item_key','sub_id']
  or exists(select from jsonb_each(p_address) e where e.key in ('board_id','item_key','sub_id')
   and (jsonb_typeof(e.value)<>'string' or e.value#>>'{}'!~'[^[:space:]]'))
  or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>16384
  or exists(select from jsonb_each(p_payload) e where e.key in ('done','del','lat') and jsonb_typeof(e.value)<>'boolean')
  or exists(select from jsonb_each(p_payload) e where e.key in ('title','t') and
   (jsonb_typeof(e.value)<>'string' or octet_length(e.value#>>'{}')>4096)) then
  raise exception 'invalid mirror delivery' using errcode='22023';end if;
 title_value:=btrim(coalesce(p_payload->>'title',p_payload->>'t',''));
 was_deleted:=coalesce((p_payload->>'del')::boolean,false);
 if not was_deleted and title_value!~'[^[:space:]]' then raise exception 'mirror title required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,15015));
 address_key:=md5(p_address::text);
 select * into pair from ga_private.roadmap_mirror_pairs where auth_user_id=actor and address_hash=address_key for update;
 pair_exists:=found;
 if pair_exists and pair.address<>p_address then raise exception 'address collision requires review' using errcode='40001';end if;
 select * into receipt from ga_private.roadmap_mirror_receipts where auth_user_id=actor and seq=p_seq;
 replayed:=found;
 if replayed and (receipt.address<>p_address or receipt.payload<>p_payload) then raise exception 'mirror sequence changed' using errcode='22023';end if;
 if replayed and not pair_exists then raise exception 'mirror receipt requires reconciliation' using errcode='40001';end if;
 if pair_exists and p_seq=pair.last_seq and pair.last_payload<>p_payload then raise exception 'mirror sequence changed' using errcode='22023';end if;
 -- Existing mirrors must have reviewed pair evidence; never match titles or guess owners.
 if exists(select from public.roadmap_tasks t where t.user_id=actor and coalesce(t.tags,'{}')&&array['wf','orphaned','wf-orphan']
  and not exists(select from ga_private.roadmap_mirror_pairs p where p.auth_user_id=actor and p.task_id=t.id)) then
  raise exception 'legacy mirrors require reconciliation' using errcode='40001';end if;
 if not pair_exists then
  project_value:=case when split_part(p_address->>'item_key',':',1)='study' then 'lang' else 'dx' end;
  if not was_deleted then
   label:=case when project_value='lang' then 'Languages' else 'DX Engineer' end;
   select array_agg(id order by id) into folders from public.roadmap_tasks where user_id=actor and parent_id is null and kind='group'
    and (project_value=any(tags) or title like label||'%');
   if cardinality(folders)>1 then raise exception 'ambiguous mirror folder requires review' using errcode='40001';end if;
   if cardinality(folders)=1 then
    select * into folder from public.roadmap_tasks where id=folders[1] and user_id=actor and parent_id is null and kind='group'
     and project_value=any(tags) and not coalesce(tags,'{}')&&array['wf','orphaned','wf-orphan'] for update;
    if not found then raise exception 'mirror folder requires review' using errcode='40001';end if;
    folder_identity:=folder.id;
   end if;
   if (select count(*) from public.roadmap_tasks where user_id=actor)+(case when folder_identity is null then 2 else 1 end)>5000 then
    raise exception 'mirror task capacity requires review' using errcode='22023';end if;
   task_identity:=gen_random_uuid();
   if folder_identity is null then
    folder_identity:=gen_random_uuid();
    ignored:=ga_private.insert_roadmap_created_task(actor,task_identity,folder_identity,null,label,'group',array[project_value]);
   end if;
   ignored:=ga_private.insert_roadmap_created_task(actor,task_identity,task_identity,folder_identity,title_value,'task',array['wf',project_value]);
  end if;
  insert into ga_private.roadmap_mirror_pairs(auth_user_id,address_hash,address,task_id,project,last_seq,last_payload,suppressed,source_deleted)
   values(actor,address_key,p_address,task_identity,project_value,p_seq,p_payload,was_deleted,was_deleted) returning * into pair;
  if not found then raise exception 'mirror pairing not saved' using errcode='40001';end if;
 end if;
 if pair.task_id is not null then
  select * into row from public.roadmap_tasks where id=pair.task_id and user_id=actor for update;
  if not found then
   if exists(select from public.roadmap_tasks where id=pair.task_id) then raise exception 'mirror task unavailable' using errcode='42501';end if;
   pair.suppressed:=true;
  elsif row.kind<>'task' then raise exception 'mirror task requires review' using errcode='40001';end if;
 end if;
 if p_seq>=pair.last_seq and not replayed then
  if p_seq>pair.effect_seq then
  if row.id is not null and not pair.suppressed then
   labels:=array['wf',pair.project]||array(select x from unnest(coalesce(row.tags,'{}')) x where x not in ('wf',pair.project,'orphaned','wf-orphan','parked'));
   if was_deleted then labels:=labels||array['orphaned'];end if;
   if coalesce((p_payload->>'lat')::boolean,false) then labels:=labels||array['parked'];end if;
   title_value:=case when was_deleted then row.title else title_value end;
   new_done:=case when was_deleted then row.done else coalesce((p_payload->>'done')::boolean,row.done) end;
   update public.roadmap_tasks set title=title_value,done=new_done,tags=labels where id=row.id and user_id=actor returning * into row;
   if not found or row.title is distinct from title_value or row.done is distinct from new_done or row.tags is distinct from labels then
    raise exception 'mirror task not saved' using errcode='40001';end if;
  end if;
  pair.effect_seq:=p_seq;pair.source_deleted:=was_deleted;
  end if;
  pair.last_seq:=p_seq;pair.last_payload:=p_payload;
 end if;
 update ga_private.roadmap_mirror_pairs set last_seq=pair.last_seq,last_payload=pair.last_payload,suppressed=pair.suppressed,source_deleted=pair.source_deleted,effect_seq=pair.effect_seq
  where auth_user_id=actor and address_hash=address_key;
 if not found then raise exception 'mirror pairing not saved' using errcode='40001';end if;
 if not replayed then
  insert into ga_private.roadmap_mirror_receipts(auth_user_id,seq,address,payload) values(actor,p_seq,p_address,p_payload);
  if not found then raise exception 'mirror receipt not saved' using errcode='40001';end if;
 end if;
 -- Replays return current rows, never a historical snapshot that could undo a newer event.
 if row.id is not null and not pair.suppressed then
  if row.parent_id is not null then
   select * into folder from public.roadmap_tasks where id=row.parent_id and user_id=actor for share;
   if not found then raise exception 'mirror parent unavailable' using errcode='42501';end if;
   rows:=rows||jsonb_build_array(to_jsonb(folder)-'user_id');
  end if;
  rows:=rows||jsonb_build_array(to_jsonb(row)-'user_id');
 end if;
 return jsonb_build_object('seq',p_seq,'address',p_address,'replayed',replayed,'last_seq',greatest(pair.last_seq,pair.effect_seq),
  'task_id',pair.task_id,'suppressed',pair.suppressed,'source_deleted',pair.source_deleted,'tasks',rows);
end $$;
commit;
