-- REVIEW CANDIDATE ONLY. Requires 01/03/09/15 and coordinated caller review.
-- Installation changes no source records. This is not an automatic CP migration.
begin;
set local search_path=pg_catalog,public;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.roadmap_tasks,public.roadmap_study_sessions,public.roadmap_daily_logs,
 public.roadmap_comparisons,public.roadmap_suggestions,public.roadmap_task_resources in access exclusive mode;
lock table ga_private.roadmap_control in share mode;
do $$ declare expected record; relation regclass; begin
 if not exists(select from ga_private.roadmap_control where id and not paused) then raise exception 'review Roadmap control';end if;
 for expected in select * from (values
  ('roadmap_tasks','eb99159acb9018231039d6f9a56099b8','7f5547fc577c69982d59b02eebde7def','6e5ad134423e598a1d667c79425df4ae'),
  ('roadmap_study_sessions','dde0138728990ecc7a2196e0d43ced68','3f4cb5667abe460795f38b6ae091375b','d41d8cd98f00b204e9800998ecf8427e'),
  ('roadmap_daily_logs','19a5420d2381053cc11fef56369231de','666346b1bc2a6fa83291c3734d862031','d41d8cd98f00b204e9800998ecf8427e'),
  ('roadmap_comparisons','77b5c920416ce41460f94343b49e9fbb','66f4b2f3ee87b881d3e4d481f90a1e36','f5efbcc55954f28e1738bff0663ea610'),
  ('roadmap_suggestions','b856cfbe3cc4fddc75f2f582a6263c89','f613f7151e3e3fc883fb847840533bc7','d41d8cd98f00b204e9800998ecf8427e'),
  ('roadmap_task_resources','21736e01e516f2f8c094d10fb6d264bb','cb840c521418f6d7227690b25cfbcc79','d41d8cd98f00b204e9800998ecf8427e')
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
   raise exception 'review structural record baseline: %',expected.tbl;
  end if;
 end loop;
 if (select count(*) from pg_constraint where confrelid='roadmap_tasks'::regclass and contype='f')<>8
  or not exists(select from pg_proc where oid='roadmap_set_updated_at()'::regprocedure and not prosecdef
   and pg_get_userbyid(proowner)='postgres' and md5(replace(prosrc,chr(13),''))='9b1889f56258bf9d6554213c05019c76')
  or not exists(select from pg_proc where oid=to_regprocedure('ga_private.insert_roadmap_created_task(uuid,uuid,uuid,uuid,text,text,text[])')
   and not prosecdef and pg_get_userbyid(proowner)='postgres' and proconfig=array['search_path=""']
   and md5(replace(prosrc,chr(13),''))='3a5e0d6e1de7f3ac555d21f9ddd4db4f') then
  raise exception 'review structural dependency or inbound cascade drift';
 end if;
end $$;

create table ga_private.roadmap_structure_receipts (
 auth_user_id uuid not null,request_id uuid not null,payload jsonb not null,
 before_state jsonb not null,after_tasks jsonb not null,row_ids uuid[] not null,
 created_at timestamptz not null default now(),primary key(auth_user_id,request_id)
);
alter table ga_private.roadmap_structure_receipts enable row level security;
revoke all on ga_private.roadmap_structure_receipts from public,anon,authenticated,service_role;

create function public.ga_roadmap_structure(p_payload jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=auth.uid(); mode text; entry jsonb; folder jsonb; target uuid; destination uuid; folder_id uuid;
 ids uuid[]:='{}'; result_ids uuid[]; before_tasks jsonb:='[]'; rows jsonb:='[]'; history jsonb;
 prior ga_private.roadmap_structure_receipts; replayed boolean; task public.roadmap_tasks; written public.roadmap_tasks;
 expected timestamptz; position_value numeric; labels text[]; related text; link text; item jsonb; current_row jsonb;
begin
 perform from ga_private.roadmap_control where id and not paused for share;
 if not found then raise exception 'structure access denied' using errcode='42501';end if;
 perform from auth.users where id=actor and email_confirmed_at is not null and is_anonymous is false
  and coalesce(auth.jwt()->>'is_anonymous','false')='false' for share;
 if not found then raise exception 'structure access denied' using errcode='42501';end if;
 if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>65536 then
  raise exception 'invalid structural request' using errcode='22023';end if;
 mode:=p_payload->>'kind';folder:=p_payload->'folder';
 if mode is null or mode not in ('move','delete') or jsonb_typeof(p_payload->'tasks') is distinct from 'array'
  or exists(select from jsonb_object_keys(p_payload) k where k not in ('kind','tasks','folder'))
  or (mode='delete' and p_payload?'folder') then raise exception 'invalid structural fields' using errcode='22023';end if;
 if jsonb_array_length(p_payload->'tasks')>100 or (jsonb_array_length(p_payload->'tasks')=0 and folder is null) then
  raise exception 'review structural batch size' using errcode='22023';end if;
 for entry in select value from jsonb_array_elements(p_payload->'tasks') loop
  if jsonb_typeof(entry)<>'object' then raise exception 'invalid structural target' using errcode='22023';end if;
  if not entry ?& array['id','expected_updated_at','label']
   or exists(select from jsonb_object_keys(entry) k where k not in ('id','expected_updated_at','label','parent_id','position'))
   or jsonb_typeof(entry->'id') is distinct from 'string' or jsonb_typeof(entry->'expected_updated_at') is distinct from 'string'
   or entry->>'expected_updated_at'!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$'
   or jsonb_typeof(entry->'label') is distinct from 'string' or octet_length(entry->>'label')>4096
   or (mode='delete' and (entry?'parent_id' or entry?'position')) then raise exception 'invalid structural target fields' using errcode='22023';end if;
  begin target:=(entry->>'id')::uuid;expected:=(entry->>'expected_updated_at')::timestamptz;
  exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format then raise exception 'invalid structural identity/version' using errcode='22023';end;
  if target=any(ids) or not isfinite(expected) then raise exception 'invalid structural identity/version' using errcode='22023';end if;
  ids:=array_append(ids,target);
  if mode='move' then
   if not entry ?& array['parent_id','position'] or jsonb_typeof(entry->'parent_id') not in ('string','null')
    or jsonb_typeof(entry->'position') is distinct from 'number' then raise exception 'invalid move fields' using errcode='22023';end if;
   position_value:=(entry->>'position')::numeric;
   if position_value<0 or position_value>2147483647 or position_value<>trunc(position_value) then raise exception 'invalid position' using errcode='22023';end if;
   begin destination:=(entry->>'parent_id')::uuid;exception when invalid_text_representation then raise exception 'invalid destination' using errcode='22023';end;
  end if;
 end loop;
 if folder is not null then
  if jsonb_typeof(folder)<>'object' then raise exception 'invalid new folder' using errcode='22023';end if;
  if not folder ?& array['id','title','parent_id','tags'] or exists(select from jsonb_object_keys(folder) k where k not in ('id','title','parent_id','tags'))
   or jsonb_typeof(folder->'id') is distinct from 'string' or jsonb_typeof(folder->'title') is distinct from 'string'
   or folder->>'title'!~'[^[:space:]]' or octet_length(folder->>'title')>4096 or jsonb_typeof(folder->'parent_id') not in ('string','null')
   or jsonb_typeof(folder->'tags') is distinct from 'array' then raise exception 'invalid new folder fields' using errcode='22023';end if;
  if jsonb_array_length(folder->'tags')>32 or exists(select from jsonb_array_elements(folder->'tags') t where jsonb_typeof(t)<>'string'
    or octet_length(t#>>'{}')>80 or t#>>'{}'!~'[^[:space:]]' or t#>>'{}' in ('wf','orphaned','wf-orphan'))
   or (select count(distinct value) from jsonb_array_elements(folder->'tags'))<>jsonb_array_length(folder->'tags') then raise exception 'invalid new folder tags' using errcode='22023';end if;
  begin folder_id:=(folder->>'id')::uuid;destination:=(folder->>'parent_id')::uuid;
  exception when invalid_text_representation then raise exception 'invalid folder identity' using errcode='22023';end;
  if folder_id=any(ids) then raise exception 'folder identity already selected' using errcode='22023';end if;
 end if;
 -- Coordinate with candidate 15. Lock current owned rows before validating the
 -- final tree. Foreign-key key-share locks keep new children out of a deletion.
 perform pg_advisory_xact_lock(hashtextextended(actor::text,15015));
 if (select count(*) from public.roadmap_tasks where user_id=actor)>5000 then raise exception 'large tree needs structural review' using errcode='22023';end if;
 perform from public.roadmap_tasks where user_id=actor order by id for update;
 select * into prior from ga_private.roadmap_structure_receipts where auth_user_id=actor and request_id=p_request_id;
 replayed:=found;result_ids:=ids;
 if replayed then
  if prior.payload is distinct from p_payload then raise exception 'request ID already used' using errcode='22023';end if;
  result_ids:=prior.row_ids;
  if mode='delete' then
   if exists(select from public.roadmap_tasks where id=any(result_ids)) then raise exception 'deleted identity now exists; review required' using errcode='40001';end if;
   return jsonb_build_object('request_id',p_request_id,'replayed',true,'kind',mode,'tasks','[]'::jsonb,'deleted_ids',result_ids);
  end if;
 else
  for entry in select value from jsonb_array_elements(p_payload->'tasks') loop
   select * into task from public.roadmap_tasks where id=(entry->>'id')::uuid and user_id=actor;
   if not found then raise exception 'structural target unavailable' using errcode='42501';end if;
   if task.updated_at is distinct from (entry->>'expected_updated_at')::timestamptz or task.title is distinct from entry->>'label' then
    raise exception 'task changed; review original structural request' using errcode='40001';end if;
   if coalesce(task.tags,'{}') && array['wf','orphaned','wf-orphan'] then raise exception 'edit mirrors in their owning app' using errcode='42501';end if;
   before_tasks:=before_tasks||jsonb_build_array(to_jsonb(task)-'user_id');
  end loop;
  if mode='move' and exists(with recursive descendants(id) as (
    select unnest(ids) union select t.id from public.roadmap_tasks t join descendants d on t.parent_id=d.id where t.user_id=actor
   ) select from descendants d join public.roadmap_tasks t on t.id=d.id
    where coalesce(t.tags,'{}') && array['wf','orphaned','wf-orphan']) then
   raise exception 'move contains mirrors owned by another app' using errcode='42501';end if;
  history:=jsonb_build_object('tasks',before_tasks);
  if mode='move' then
   if folder is not null then
    destination:=(folder->>'parent_id')::uuid;
    if destination is not null and not exists(select from public.roadmap_tasks where id=destination and user_id=actor and kind='group'
     and not coalesce(tags,'{}') && array['wf','orphaned','wf-orphan']) then raise exception 'folder parent unavailable' using errcode='42501';end if;
    select coalesce(array_agg(value),'{}') into labels from jsonb_array_elements_text(folder->'tags');
    perform ga_private.insert_roadmap_created_task(actor,p_request_id,folder_id,destination,folder->>'title','group',labels);
    result_ids:=array_append(result_ids,folder_id);
   end if;
   for entry in select value from jsonb_array_elements(p_payload->'tasks') loop
    target:=(entry->>'id')::uuid;destination:=(entry->>'parent_id')::uuid;
    if destination is not null and not exists(select from public.roadmap_tasks where id=destination and user_id=actor and kind='group'
     and not coalesce(tags,'{}') && array['wf','orphaned','wf-orphan']) then raise exception 'move destination unavailable' using errcode='42501';end if;
    select * into task from public.roadmap_tasks where id=target and user_id=actor;
    update public.roadmap_tasks set parent_id=destination,position=(entry->>'position')::numeric::integer where id=target and user_id=actor returning * into written;
    if not found or written.parent_id is distinct from destination or written.position is distinct from (entry->>'position')::numeric::integer
     or written.updated_at is null or not isfinite(written.updated_at)
     or (to_jsonb(written)-'parent_id'-'position'-'updated_at') is distinct from (to_jsonb(task)-'parent_id'-'position'-'updated_at') then
     raise exception 'structural write not confirmed' using errcode='42501';end if;
   end loop;
   if exists(with recursive ancestry(id,parent_id,path,cycle) as (
     select id,parent_id,array[id],false from public.roadmap_tasks where id=any(result_ids) and user_id=actor
     union all select a.id,p.parent_id,a.path||p.id,p.id=any(a.path) from ancestry a join public.roadmap_tasks p on p.id=a.parent_id and p.user_id=actor where not a.cycle
    ) select from ancestry where cycle) then raise exception 'move would create a cycle' using errcode='22023';end if;
  else
   if exists(select from public.roadmap_tasks where parent_id=any(ids) and not id=any(ids)) then
    raise exception 'deletion subtree changed; review every descendant' using errcode='40001';end if;
   -- Freeze the linked records before retaining exact recovery evidence.
   foreach related in array array['roadmap_study_sessions','roadmap_daily_logs','roadmap_comparisons','roadmap_suggestions','roadmap_task_resources'] loop
    link:=case when related='roadmap_suggestions' then 'rm_task_id' else 'task_id' end;
    execute format('select 1 from public.%I where user_id=$1 and %I=any($2) order by id for update',related,link) using actor,ids;
    execute format('select coalesce(jsonb_agg(to_jsonb(t)-''user_id'' order by id),''[]'') from public.%I t where user_id=$1 and %I=any($2)',related,link)
     into rows using actor,ids;
    history:=history||jsonb_build_object(related,rows);
   end loop;
   if octet_length(history::text)>1048576 then raise exception 'deletion history exceeds review limit' using errcode='22023';end if;
   -- Sessions otherwise cascade. Retain proof/feedback under the same owner.
   update public.roadmap_study_sessions set task_id=null where user_id=actor and task_id=any(ids);
   insert into ga_private.roadmap_creation_ids(id,auth_user_id,request_id)
    select unnest(ids),actor,p_request_id on conflict(id) do nothing;
   if exists(select from unnest(ids) i left join ga_private.roadmap_creation_ids c on c.id=i where c.id is null) then raise exception 'deleted identity reservation not confirmed' using errcode='42501';end if;
   delete from public.roadmap_tasks where id=any(ids) and user_id=actor;
   if exists(select from public.roadmap_tasks where id=any(ids)) then raise exception 'deletion not confirmed' using errcode='42501';end if;
   foreach related in array array['roadmap_study_sessions','roadmap_daily_logs','roadmap_comparisons','roadmap_suggestions'] loop
    link:=case when related='roadmap_suggestions' then 'rm_task_id' else 'task_id' end;
    for item in select value from jsonb_array_elements(history->related) loop
     execute format('select to_jsonb(t)-''user_id'' from public.%I t where id::text=$1 and user_id=$2',related) into current_row using item->>'id',actor;
     if current_row is null or current_row->link is distinct from 'null'::jsonb
      or (current_row-link-'updated_at') is distinct from (item-link-'updated_at') then raise exception 'linked history not retained' using errcode='42501';end if;
    end loop;
   end loop;
   if exists(select from public.roadmap_task_resources where task_id=any(ids)) then raise exception 'resource deletion not confirmed' using errcode='42501';end if;
  end if;
 end if;
 rows:='[]';
 if mode='move' then
  -- Refuse a result the existing client cannot acknowledge, before committing.
  if exists(select from public.roadmap_tasks where id=any(result_ids) and user_id=actor and
   (kind is null or done is null or expanded is null or position is null or streak is null
    or title is null or tags is null or array_position(tags,null) is not null
    or created_at is null or not isfinite(created_at) or updated_at is null or not isfinite(updated_at))) then
   raise exception 'structural row needs review' using errcode='42501';end if;
  select coalesce(jsonb_agg(to_jsonb(t)-'user_id' order by id),'[]') into rows from public.roadmap_tasks t where id=any(result_ids) and user_id=actor;
  if jsonb_array_length(rows)<>cardinality(result_ids) then raise exception 'structural result unavailable' using errcode='42501';end if;
 end if;
 if not replayed then
  insert into ga_private.roadmap_structure_receipts(auth_user_id,request_id,payload,before_state,after_tasks,row_ids)
   values(actor,p_request_id,p_payload,history,rows,result_ids);
  if not found then raise exception 'structural receipt not confirmed' using errcode='42501';end if;
 end if;
 return jsonb_build_object('request_id',p_request_id,'replayed',replayed,'kind',mode,'tasks',rows,
  'deleted_ids',case when mode='delete' then to_jsonb(result_ids) else '[]'::jsonb end);
exception when unique_violation then raise exception 'structural identity unavailable' using errcode='42501';
end $$;
revoke all on function public.ga_roadmap_structure(jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.ga_roadmap_structure(jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
