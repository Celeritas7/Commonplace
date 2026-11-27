-- REVIEW CANDIDATE ONLY. Requires 01/03/15. No hosted installation or hub activation.
-- Reconcile existing links (including deleted tasks) before enabling any owner.
begin;
set local search_path=pg_catalog,public;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.roadmap_tasks in access exclusive mode;
lock table ga_private.roadmap_control in share mode;
do $$ declare expected record; relation regclass; begin
 if not exists(select from ga_private.roadmap_control where id and not paused) then raise exception 'review Roadmap control';end if;
 for expected in select * from (values
  ('roadmap_tasks','eb99159acb9018231039d6f9a56099b8','7f5547fc577c69982d59b02eebde7def','6e5ad134423e598a1d667c79425df4ae')
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
   raise exception 'review mirror task baseline: %',expected.tbl;
  end if;
 end loop;
 if not exists(select from pg_proc where oid='public.roadmap_set_updated_at()'::regprocedure and not prosecdef
  and pg_get_userbyid(proowner)='postgres' and md5(replace(prosrc,chr(13),''))='9b1889f56258bf9d6554213c05019c76') then raise exception 'review task timestamp trigger';end if;
 if not exists(select from pg_proc where oid='ga_private.insert_roadmap_created_task(uuid,uuid,uuid,uuid,text,text,text[])'::regprocedure
  and not prosecdef and pg_get_userbyid(proowner)='postgres' and proconfig=array['search_path=""']
  and md5(replace(prosrc,chr(13),''))='3a5e0d6e1de7f3ac555d21f9ddd4db4f') then raise exception 'review candidate 15 helper';end if;
end $$;

-- Empty, private, default-deny gate. Reviewers seed only verified original owners.
create table ga_private.roadmap_mirror_access (
 auth_user_id uuid primary key,enabled boolean not null default false,
 review_ref text not null check(length(btrim(review_ref))>0)
);
-- Exact JSON equality is checked after hashing: a hash collision never aliases addresses.
-- No task FK: local deletion must not destroy the evidence that prevents resurrection.
create table ga_private.roadmap_mirror_pairs (
 auth_user_id uuid not null,address_hash text not null,address jsonb not null,
 task_id uuid,project text not null check(project in ('lang','dx')),
 last_seq bigint not null check(last_seq>0),last_payload jsonb not null,
 suppressed boolean not null default false,source_deleted boolean not null default false,
 primary key(auth_user_id,address_hash),unique(auth_user_id,task_id)
);
create table ga_private.roadmap_mirror_receipts (
 auth_user_id uuid not null,seq bigint not null,address jsonb not null,payload jsonb not null,
 created_at timestamptz not null default now(),primary key(auth_user_id,seq)
);
alter table ga_private.roadmap_mirror_access enable row level security;
alter table ga_private.roadmap_mirror_pairs enable row level security;
alter table ga_private.roadmap_mirror_receipts enable row level security;
revoke all on ga_private.roadmap_mirror_access,ga_private.roadmap_mirror_pairs,ga_private.roadmap_mirror_receipts from public,anon,authenticated,service_role;

create function public.ga_roadmap_receive_task(p_address jsonb,p_payload jsonb,p_seq bigint)
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
  pair.last_seq:=p_seq;pair.last_payload:=p_payload;pair.source_deleted:=was_deleted;
 end if;
 update ga_private.roadmap_mirror_pairs set last_seq=pair.last_seq,last_payload=pair.last_payload,suppressed=pair.suppressed,source_deleted=pair.source_deleted
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
 return jsonb_build_object('seq',p_seq,'address',p_address,'replayed',replayed,'last_seq',pair.last_seq,
  'task_id',pair.task_id,'suppressed',pair.suppressed,'source_deleted',pair.source_deleted,'tasks',rows);
end $$;
revoke all on function public.ga_roadmap_receive_task(jsonb,jsonb,bigint) from public,anon,authenticated,service_role;
grant execute on function public.ga_roadmap_receive_task(jsonb,jsonb,bigint) to authenticated;
commit;
