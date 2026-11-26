-- REVIEW CANDIDATE ONLY. After 01/03 and owning-client/recovery acceptance.
-- Additive task creation and atomic capture; no historical rows are rewritten.
begin;
set local search_path=pg_catalog,public;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.roadmap_tasks in access exclusive mode;
lock table ga_private.roadmap_control in share mode;
do $$ begin
 if not exists(select from ga_private.roadmap_control where id and not paused) then
  raise exception 'review active Roadmap control';
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
  raise exception 'review task creation baseline drift';
 end if;
 if not exists(select from pg_constraint where conrelid='roadmap_tasks'::regclass
  and conname='roadmap_tasks_pkey' and convalidated and pg_get_constraintdef(oid)='PRIMARY KEY (id)')
 or not exists(select from pg_constraint where conrelid='roadmap_tasks'::regclass
  and conname='ga_parent_owner' and convalidated and pg_get_constraintdef(oid)=
  'FOREIGN KEY (parent_id, user_id) REFERENCES roadmap_tasks(id, user_id) ON DELETE CASCADE') then
  raise exception 'review candidate 03 task constraints';
 end if;
 if (select count(*) from pg_trigger where not tgisinternal and tgrelid='roadmap_tasks'::regclass)<>1
 or not exists(select from pg_trigger where tgrelid='roadmap_tasks'::regclass
  and tgname='roadmap_tasks_set_updated_at' and tgfoid='roadmap_set_updated_at()'::regprocedure
  and tgtype=19 and tgenabled='O')
 or not exists(select from pg_proc where oid='roadmap_set_updated_at()'::regprocedure and not prosecdef
  and pg_get_userbyid(proowner)='postgres' and md5(replace(prosrc,chr(13),''))='9b1889f56258bf9d6554213c05019c76') then
  raise exception 'review task creation trigger drift';
 end if;
end $$;

-- Private evidence and UUID reservations survive deletion. Neither is a restore API.
create table ga_private.roadmap_creation_receipts (
 auth_user_id uuid not null,request_id uuid not null,payload jsonb not null,
 row_ids uuid[] not null,created_rows jsonb not null,
 created_at timestamptz not null default now(),primary key(auth_user_id,request_id)
);
create table ga_private.roadmap_creation_ids (
 id uuid primary key,auth_user_id uuid not null,request_id uuid not null
);
alter table ga_private.roadmap_creation_receipts enable row level security;
alter table ga_private.roadmap_creation_ids enable row level security;
revoke all on ga_private.roadmap_creation_receipts,ga_private.roadmap_creation_ids from public,anon,authenticated,service_role;

-- Internal only. Callers cannot choose ownership, completion, streak or position.
create function ga_private.insert_roadmap_created_task(actor uuid,request uuid,identity uuid,parent uuid,
 name text,category text,labels text[]) returns jsonb language plpgsql set search_path='' as $$
declare written public.roadmap_tasks; next_position bigint;
begin
 select coalesce(max(position)::bigint,-1)+1 into next_position from public.roadmap_tasks
  where user_id=actor and parent_id is not distinct from parent;
 if next_position>2147483647 then raise exception 'task positions need review' using errcode='22023'; end if;
 insert into ga_private.roadmap_creation_ids values(identity,actor,request);
 if not found then raise exception 'task identity not reserved' using errcode='42501'; end if;
 insert into public.roadmap_tasks(id,user_id,parent_id,title,kind,position,tags,done,expanded,streak,streak_day)
  values(identity,actor,parent,name,category,next_position,labels,false,true,0,null) returning * into written;
 if not found or written.id is distinct from identity or written.user_id is distinct from actor
  or written.parent_id is distinct from parent or written.title is distinct from name or written.kind is distinct from category
  or written.position is distinct from next_position or written.tags is distinct from labels
  or written.done is distinct from false or written.expanded is distinct from true or written.streak is distinct from 0
  or written.streak_day is not null or written.created_at is null or not isfinite(written.created_at)
  or written.updated_at is null or not isfinite(written.updated_at) then
  raise exception 'task creation not confirmed' using errcode='42501';
 end if;
 return to_jsonb(written)-'user_id';
end $$;
revoke all on function ga_private.insert_roadmap_created_task(uuid,uuid,uuid,uuid,text,text,text[]) from public,anon,authenticated,service_role;

create function public.ga_roadmap_create_tasks(p_payload jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=auth.uid(); entry jsonb; prior ga_private.roadmap_creation_receipts;
 replayed boolean; mode text; target uuid; parent uuid; root_id uuid; folder_id uuid; matches uuid[];
 ids uuid[]:='{}'; rows jsonb:='[]'; created jsonb:='[]'; labels text[]; folder_labels text[]; row public.roadmap_tasks;
begin
 perform from ga_private.roadmap_control where id and not paused for share;
 if not found then raise exception 'task creation access denied' using errcode='42501'; end if;
 perform from auth.users where id=actor and email_confirmed_at is not null and is_anonymous is false
  and coalesce(auth.jwt()->>'is_anonymous','false')='false' for share;
 if not found then raise exception 'task creation access denied' using errcode='42501'; end if;
 if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>65536 then
  raise exception 'invalid task creation' using errcode='22023'; end if;
 mode:=p_payload->>'kind';
 if mode is null or mode not in ('task','capture') or jsonb_typeof(p_payload->'items') is distinct from 'array'
  or exists(select from jsonb_object_keys(p_payload) k where k not in ('kind','items','parent_id','text')) then
  raise exception 'invalid task creation fields' using errcode='22023'; end if;
 if jsonb_array_length(p_payload->'items') not between 1 and 32
  or (mode='task' and (jsonb_array_length(p_payload->'items')<>1 or not p_payload?'parent_id' or p_payload?'text'
   or jsonb_typeof(p_payload->'parent_id') not in ('string','null')))
  or (mode='capture' and (p_payload?'parent_id' or jsonb_typeof(p_payload->'text') is distinct from 'string'
   or octet_length(p_payload->>'text')>32768 or p_payload->>'text'!~'[^[:space:]]')) then
  raise exception 'review task creation batch' using errcode='22023'; end if;
 for entry in select value from jsonb_array_elements(p_payload->'items') loop
  if jsonb_typeof(entry)<>'object' then raise exception 'invalid new task' using errcode='22023'; end if;
  if not entry ?& array['id','title','tags'] or exists(select from jsonb_object_keys(entry) k where k not in ('id','title','tags','folder'))
   or jsonb_typeof(entry->'id') is distinct from 'string' or jsonb_typeof(entry->'title') is distinct from 'string'
   or octet_length(entry->>'title')>4096 or entry->>'title'!~'[^[:space:]]'
   or jsonb_typeof(entry->'tags') is distinct from 'array'
   or (mode='task' and entry?'folder')
   or (mode='capture' and (jsonb_typeof(entry->'folder') is distinct from 'string'
    or entry->>'folder' not in ('Shopping','Places','App dev','Languages','Office','Home','Other'))) then
   raise exception 'invalid new task fields' using errcode='22023'; end if;
  if jsonb_array_length(entry->'tags')>32
   or exists(select from jsonb_array_elements(entry->'tags') t where jsonb_typeof(t)<>'string'
    or octet_length(t#>>'{}')>80 or t#>>'{}'!~'[^[:space:]]' or t#>>'{}' in ('wf','orphaned','wf-orphan'))
   or (select count(distinct value) from jsonb_array_elements(entry->'tags'))<>jsonb_array_length(entry->'tags')
   or (mode='capture' and not (entry->'tags')?'parked') then
   raise exception 'invalid new task tags' using errcode='22023'; end if;
  begin target:=(entry->>'id')::uuid;
  exception when invalid_text_representation then raise exception 'invalid task identity' using errcode='22023'; end;
  if target=any(ids) then raise exception 'duplicate task identity' using errcode='22023'; end if;
  ids:=array_append(ids,target);
 end loop;
 if mode='task' then
  begin parent:=(p_payload->>'parent_id')::uuid;
  exception when invalid_text_representation then raise exception 'invalid task parent' using errcode='22023'; end;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,15015));
 select * into prior from ga_private.roadmap_creation_receipts where auth_user_id=actor and request_id=p_request_id;
 replayed:=found;
 if replayed then
  if prior.payload is distinct from p_payload then raise exception 'request ID already used' using errcode='22023'; end if;
  ids:=prior.row_ids;
 else
  -- Parent locks observe ownership changes committed while waiting.
  if mode='task' and parent is not null then
   perform from public.roadmap_tasks where id=parent and user_id=actor and kind='group'
    and not coalesce(tags,'{}') && array['wf','orphaned','wf-orphan'] for share;
   if not found then raise exception 'task parent unavailable' using errcode='42501'; end if;
  end if;
  if mode='capture' then
   select array_agg(id) into matches from (select id from public.roadmap_tasks
    where user_id=actor and parent_id is null and kind='group' and title='Captured' order by id for share) locked;
   if cardinality(matches)>1 then raise exception 'ambiguous capture root; review folders' using errcode='22023'; end if;
   root_id:=matches[1];
   if root_id is null then
    root_id:=gen_random_uuid();created:=created||jsonb_build_array(ga_private.insert_roadmap_created_task(actor,p_request_id,root_id,null,'Captured','group',array['inbox']));
   elsif not exists(select from public.roadmap_tasks where id=root_id and tags @> array['inbox']
    and not tags && array['wf','orphaned','wf-orphan']) then
    raise exception 'capture root needs review' using errcode='22023';
   end if;
   ids:=array_append(ids,root_id);
  end if;
  for entry in select value from jsonb_array_elements(p_payload->'items') loop
   target:=(entry->>'id')::uuid;
   select coalesce(array_agg(value),'{}') into labels from jsonb_array_elements_text(entry->'tags');
   if mode='capture' then
    folder_labels:=case entry->>'folder' when 'Shopping' then array['shop'] when 'Places' then array['place']
     when 'App dev' then array['dx'] when 'Languages' then array['lang'] when 'Office' then array['work']
     when 'Home' then array['house'] else '{}'::text[] end;
    select array_agg(id) into matches from (select id from public.roadmap_tasks where user_id=actor and parent_id=root_id
     and kind='group' and title=entry->>'folder' order by id for share) locked;
    if cardinality(matches)>1 then raise exception 'ambiguous capture folder; review folders' using errcode='22023'; end if;
    folder_id:=matches[1];
    if folder_id is null then
     folder_id:=gen_random_uuid();created:=created||jsonb_build_array(ga_private.insert_roadmap_created_task(actor,p_request_id,folder_id,root_id,entry->>'folder','group',folder_labels));
    elsif not exists(select from public.roadmap_tasks where id=folder_id and tags @> folder_labels
     and not tags && array['wf','orphaned','wf-orphan']) then raise exception 'capture folder needs review' using errcode='22023';
    end if;
    if not folder_id=any(ids) then ids:=array_append(ids,folder_id);end if;
    parent:=folder_id;
   end if;
   created:=created||jsonb_build_array(ga_private.insert_roadmap_created_task(actor,p_request_id,target,parent,entry->>'title','task',labels));
  end loop;
  insert into ga_private.roadmap_creation_receipts(auth_user_id,request_id,payload,row_ids,created_rows)
   values(actor,p_request_id,p_payload,ids,created);
  if not found then raise exception 'creation receipt not confirmed' using errcode='42501'; end if;
 end if;
 -- Return current owned rows, never the historical snapshot. Missing rows deny
 -- the whole replay; a deleted task/root/folder is never silently recreated.
 for row in select * from public.roadmap_tasks where id=any(ids) and user_id=actor order by id for share loop
  -- Legacy columns are nullable. Do not commit a new batch whose reused
  -- folder cannot be represented by the existing client row contract.
  if row.kind is null or row.done is null or row.expanded is null or row.position is null
   or row.tags is null or array_position(row.tags,null) is not null
   or row.created_at is null or not isfinite(row.created_at) or row.updated_at is null or not isfinite(row.updated_at) then
   raise exception 'created task state needs review' using errcode='22023';
  end if;
  rows:=rows||jsonb_build_array(to_jsonb(row)-'user_id');
 end loop;
 if jsonb_array_length(rows)<>cardinality(ids) then raise exception 'created task unavailable' using errcode='42501';end if;
 return jsonb_build_object('request_id',p_request_id,'replayed',replayed,'tasks',rows);
exception when unique_violation then
 raise exception 'task identity unavailable; review original retry' using errcode='42501';
end $$;
revoke all on function public.ga_roadmap_create_tasks(jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.ga_roadmap_create_tasks(jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
