-- REVIEW CANDIDATE ONLY. Requires 01/03 and the pinned Akatsuki R001/R023 catalog.
-- Per-owner preparation; no hosted installation or independent app authority.
begin;
set local search_path=pg_catalog,public;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.akatsuki_state,public.akatsuki_places in access exclusive mode;
do $$ declare expected record; relation regclass; begin
 for expected in select * from (values
  ('akatsuki_state','5c2c406a954ce832af041de9b3b341c1','43b8d1d987d9604deb8208c9d3a2857b','ALL'),
  ('akatsuki_places','69fd33ce01167246d1adea1cbd163f16','fedf5fb730f278376b9abaffd0ee888f','SELECT')
 ) t(tbl,columns_hash,constraints_hash,command) loop
  relation:=format('public.%I',expected.tbl)::regclass;
  if not exists(select from pg_class where oid=relation and relkind='r' and relrowsecurity and pg_get_userbyid(relowner)='postgres')
   or (select md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull::text||':'||coalesce(pg_get_expr(d.adbin,d.adrelid),''),'|' order by a.attnum))
    from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=relation and a.attnum>0 and not a.attisdropped) is distinct from expected.columns_hash
   or (select md5(string_agg(conname||':'||pg_get_constraintdef(oid)||':'||convalidated,E'\n' order by conname)) from pg_constraint where conrelid=relation) is distinct from expected.constraints_hash
   or (select count(*) from pg_policies where schemaname='public' and tablename=expected.tbl)<>1
   or not exists(select from pg_policies where schemaname='public' and tablename=expected.tbl and cmd=expected.command and roles='{authenticated}'
    and permissive='PERMISSIVE' and qual='(user_id = auth.uid())' and (expected.command='SELECT' and with_check is null or with_check=qual))
   then raise exception 'review shared writer catalog: %',expected.tbl;end if;
 end loop;
 if (select count(*) from pg_trigger where tgrelid='public.akatsuki_state'::regclass and not tgisinternal)<>1
  or not exists(select from pg_trigger where tgrelid='public.akatsuki_state'::regclass and tgname='akatsuki_state_guard'
   and tgfoid='public.akatsuki_state_guard()'::regprocedure and tgtype=23 and tgenabled='O' and tgqual is null)
  or exists(select from pg_trigger where tgrelid='public.akatsuki_places'::regclass and not tgisinternal) then raise exception 'review shared writer triggers';end if;
 for expected in select * from (values
  ('public.akatsuki_state_guard()','ad74bb809b996347e3f19d422a9ae082'),
  ('public.akatsuki_place_slug(text)','13900d7e6f74e91a26c1d09a7ef17c06')
 ) t(signature,body_hash) loop
  if not exists(select from pg_proc where oid=expected.signature::regprocedure and not prosecdef and pg_get_userbyid(proowner)='postgres'
   and proconfig is null and md5(replace(prosrc,chr(13),''))=expected.body_hash) then raise exception 'review shared writer routine: %',expected.signature;end if;
 end loop;
 if not exists(select from ga_private.roadmap_control where id and not paused) then raise exception 'review Roadmap control';end if;
end $$;

-- Same ownership/clock semantics, qualified so it also works inside an empty
-- security-definer search path. No table policy or legacy grant is widened.
create or replace function public.akatsuki_state_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and new.owner_app<>old.owner_app then raise exception 'document owner cannot change';end if;
 if new.updated_by is distinct from new.owner_app then raise exception 'document writer must match owner';end if;
 new.seq:=nextval('public.akatsuki_seq');new.updated_at:=now();return new;
end $$;

create table ga_private.roadmap_shared_access(
 auth_user_id uuid not null,kind text not null check(kind in ('document','place')),doc text not null default '',path text not null default '',
 enabled boolean not null default false,review_ref text not null check(length(btrim(review_ref))>0),primary key(auth_user_id,kind,doc,path)
);
create table ga_private.roadmap_shared_receipts(
 auth_user_id uuid not null,request_id uuid not null,target jsonb not null,expected_revision text,change jsonb not null,
 applied_revision text not null,created_at timestamptz not null default now(),primary key(auth_user_id,request_id)
);
alter table ga_private.roadmap_shared_access enable row level security;
alter table ga_private.roadmap_shared_receipts enable row level security;
revoke all on ga_private.roadmap_shared_access,ga_private.roadmap_shared_receipts from public,anon,authenticated,service_role;

create function ga_private.roadmap_shared_snapshot(p_target jsonb,p_write boolean) returns jsonb
language plpgsql set search_path='' as $$
declare actor uuid:=auth.uid();row_value jsonb;kind text:=p_target->>'kind';
begin
 perform from ga_private.roadmap_control where id and not paused for share;
 if not found then raise exception 'shared access denied' using errcode='42501';end if;
 perform from auth.users where id=actor and email_confirmed_at is not null and is_anonymous is false
  and coalesce(auth.jwt()->>'is_anonymous','false')='false' for share;
 if not found then raise exception 'shared access denied' using errcode='42501';end if;
 if jsonb_typeof(p_target) is distinct from 'object' or octet_length(p_target::text)>4096
  or kind is null or kind not in ('document','place') then raise exception 'invalid shared target' using errcode='22023';end if;
 if kind='document' then
  if (select count(*) from jsonb_object_keys(p_target))<>4 or not p_target ?& array['kind','doc','path','key']
   or not ((p_target->>'doc'='task_tags' and p_target->>'path'='rm') or (p_target->>'doc'='roadmap_now' and p_target->>'path'='suggestion'))
   or jsonb_typeof(p_target->'key') is distinct from 'string' or octet_length(p_target->>'key')>1024
   or p_target->>'doc'='roadmap_now' and p_target->>'key'<>'' then raise exception 'unreviewed document target' using errcode='22023';end if;
 else
  if (select count(*) from jsonb_object_keys(p_target))<>2 or jsonb_typeof(p_target->'id') is distinct from 'string'
   or length(btrim(p_target->>'id')) not between 1 and 160 or p_target->>'id'~'[[:cntrl:]]' then raise exception 'invalid place identity' using errcode='22023';end if;
 end if;
 perform from ga_private.roadmap_shared_access g where g.auth_user_id=actor and g.kind= p_target->>'kind'
  and g.doc=coalesce(p_target->>'doc','') and g.path=coalesce(p_target->>'path','') and g.enabled for share;
 if not found then raise exception 'shared writer review required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,15015));
 -- These short table locks cover absent-row/alias races and legacy writers
 -- which do not take the new advisory lock. Read/write transactions are bounded.
 if kind='document' then
  if p_write then lock table public.akatsuki_state in share row exclusive mode;else lock table public.akatsuki_state in share mode;end if;
  select to_jsonb(r) into row_value from public.akatsuki_state r
   where user_id=actor and doc=p_target->>'doc' and path=p_target->>'path' and item_key=p_target->>'key';
  if row_value is not null and row_value->>'owner_app'<>'rm' then raise exception 'document belongs to a different writer' using errcode='42501';end if;
 else
  if p_write then lock table public.akatsuki_places in share row exclusive mode;else lock table public.akatsuki_places in share mode;end if;
  select to_jsonb(r) into row_value from public.akatsuki_places r where user_id=actor and id=p_target->>'id';
 end if;
 if row_value is not null and ((row_value->>'seq')::bigint<0 or (row_value->>'seq')::bigint>9007199254740991) then
  raise exception 'unsafe shared sequence' using errcode='22023';end if;
 return jsonb_build_object('protocol','roadmap.shared.v1','owner',actor,'target',p_target,
  'revision',case when row_value is null then null else md5(row_value::text) end,'record',row_value);
end $$;

create function public.ga_roadmap_shared_read(p_target jsonb) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='5s' set statement_timeout='15s' as $$
begin return ga_private.roadmap_shared_snapshot(p_target,false);end $$;

create function public.ga_roadmap_shared_write(p_target jsonb,p_expected_revision text,p_change jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' set lock_timeout='5s' set statement_timeout='15s' as $$
declare actor uuid:=auth.uid();before_value jsonb;after_value jsonb;prior ga_private.roadmap_shared_receipts;
 op text:=p_change->>'op';patch jsonb;place public.akatsuki_places;names text[];reply jsonb;applied text;count_rows integer;
begin
 before_value:=ga_private.roadmap_shared_snapshot(p_target,true);
 if p_request_id is null or p_expected_revision is not null and p_expected_revision!~'^[0-9a-f]{32}$'
  or jsonb_typeof(p_change) is distinct from 'object' or octet_length(p_change::text)>32768 then raise exception 'invalid shared change' using errcode='22023';end if;
 select * into prior from ga_private.roadmap_shared_receipts where auth_user_id=actor and request_id=p_request_id;
 if found then
  if prior.target is distinct from p_target or prior.expected_revision is distinct from p_expected_revision or prior.change is distinct from p_change then
   raise exception 'original shared request changed' using errcode='22023';end if;
  return jsonb_build_object('protocol','roadmap.shared.v1','owner',actor,'request_id',p_request_id,'target',p_target,
   'expected_revision',p_expected_revision,'change',p_change,'status','saved','replayed',true,'applied_revision',prior.applied_revision,'current',before_value);
 end if;
 if before_value->>'revision' is distinct from p_expected_revision then
  return jsonb_build_object('protocol','roadmap.shared.v1','owner',actor,'request_id',p_request_id,'target',p_target,
   'expected_revision',p_expected_revision,'change',p_change,'status','conflict','replayed',false,'current',before_value);
 end if;
 if p_target->>'kind'='document' then
  if op='put' then
   if (select count(*) from jsonb_object_keys(p_change))<>2 or not p_change ? 'value' then raise exception 'invalid document change' using errcode='22023';end if;
  elsif op='remove' then
   if (select count(*) from jsonb_object_keys(p_change))<>1 then raise exception 'invalid document removal' using errcode='22023';end if;
  else raise exception 'invalid document operation' using errcode='22023';end if;
  -- Removing an absent item creates a tombstone; a stale create cannot revive it.
  insert into public.akatsuki_state(user_id,doc,path,item_key,owner_app,updated_by,value,deleted_at)
   values(actor,p_target->>'doc',p_target->>'path',p_target->>'key','rm','rm',case when op='put' then p_change->'value' else null end,case when op='remove' then now() else null end)
   on conflict(user_id,doc,path,item_key) do update set value=case when op='put' then excluded.value else akatsuki_state.value end,
    deleted_at=excluded.deleted_at,updated_by='rm';
  get diagnostics count_rows=row_count;
 else
  if op is null or op not in ('create','edit','retire','restore') then raise exception 'invalid place operation' using errcode='22023';end if;
  select * into place from public.akatsuki_places where user_id=actor and id=p_target->>'id';
  if op='create' then
   if place.id is not null or (select count(*) from jsonb_object_keys(p_change))<>5 or not p_change ?& array['op','label','class','aliases','ord'] then raise exception 'explicit new place required' using errcode='22023';end if;
   patch:=p_change-'op';place.user_id:=actor;place.id:=p_target->>'id';place.aliases:='{}';place.added_by:='rm';
  elsif op='edit' then
   if place.id is null or (select count(*) from jsonb_object_keys(p_change))<>2 or jsonb_typeof(p_change->'patch') is distinct from 'object' or p_change->'patch'='{}' then raise exception 'invalid place edit' using errcode='22023';end if;
   patch:=p_change->'patch';
  else
   if place.id is null or (select count(*) from jsonb_object_keys(p_change))<>1 then raise exception 'existing place required' using errcode='22023';end if;
   patch:='{}';
  end if;
  if exists(select from jsonb_object_keys(patch) k where k not in ('label','class','aliases','ord'))
   or patch ? 'label' and (jsonb_typeof(patch->'label')<>'string' or length(btrim(patch->>'label')) not between 1 and 160)
   or patch ? 'class' and (jsonb_typeof(patch->'class')<>'string' or patch->>'class' not in ('home','office','transit','cafe','out'))
   or patch ? 'ord' and (jsonb_typeof(patch->'ord')<>'number' or (patch->>'ord')!~'^-?[0-9]{1,7}$')
   or patch ? 'aliases' and jsonb_typeof(patch->'aliases')<>'array' then raise exception 'invalid place fields' using errcode='22023';end if;
  if patch ? 'aliases' then
   if jsonb_array_length(patch->'aliases')>32 or exists(select from jsonb_array_elements(patch->'aliases') a where jsonb_typeof(a)<>'string' or length(btrim(a#>>'{}')) not between 1 and 160) then raise exception 'invalid place aliases' using errcode='22023';end if;
  end if;
  if patch ? 'label' and place.label is not null and place.label<>btrim(patch->>'label') then place.aliases:=array_append(place.aliases,place.label);end if;
  place.label:=coalesce(btrim(patch->>'label'),place.label);place.class:=coalesce(patch->>'class',place.class);place.ord:=coalesce((patch->>'ord')::integer,place.ord);
  place.aliases:=array(select distinct a from unnest(place.aliases||array(select btrim(value) from jsonb_array_elements_text(coalesce(patch->'aliases','[]')))) a order by a);
  if cardinality(place.aliases)>64 then raise exception 'place aliases require review' using errcode='22023';end if;
  if op='restore' then place.retired_at:=null;end if;
  if op='retire' then place.retired_at:=coalesce(place.retired_at,now());end if;
  if place.retired_at is null then
   names:=place.aliases||array[place.label,place.id];
   if exists(select from public.akatsuki_places p cross join lateral unnest(p.aliases||array[p.label,p.id]) theirs cross join unnest(names) ours
    where p.user_id=actor and p.id<>place.id and p.retired_at is null and
     (lower(btrim(theirs))=lower(btrim(ours)) or public.akatsuki_place_slug(ours)<>'' and public.akatsuki_place_slug(theirs)=public.akatsuki_place_slug(ours))) then
    raise exception 'place name matches another saved place; review places' using errcode='23505';end if;
  end if;
  if op='create' then
   insert into public.akatsuki_places(user_id,id,label,class,aliases,ord,added_by) values(actor,place.id,place.label,place.class,place.aliases,place.ord,'rm');
  else
   update public.akatsuki_places set label=place.label,class=place.class,aliases=place.aliases,ord=place.ord,
    retired_at=place.retired_at,seq=nextval('public.akatsuki_seq'),updated_at=now() where user_id=actor and id=place.id;
  end if;
  get diagnostics count_rows=row_count;
 end if;
 if count_rows<>1 then raise exception 'shared change was not saved' using errcode='40001';end if;
 after_value:=ga_private.roadmap_shared_snapshot(p_target,true);applied:=after_value->>'revision';
 if applied is null or applied is not distinct from p_expected_revision then raise exception 'shared revision was not saved' using errcode='40001';end if;
 if p_target->>'kind'='document' then
  if (after_value->'record'->'value') is distinct from (case when op='put' then p_change->'value' else coalesce(before_value->'record'->'value','null'::jsonb) end)
   or (after_value->'record'->>'deleted_at' is null) is distinct from (op='put')
   or after_value->'record'->>'updated_by'<>'rm' then raise exception 'document result changed' using errcode='40001';end if;
 else
  if after_value->'record'->>'label' is distinct from place.label or after_value->'record'->>'class' is distinct from place.class
   or after_value->'record'->'aliases' is distinct from to_jsonb(place.aliases)
   or (after_value->'record'->>'ord')::integer is distinct from place.ord
   or (after_value->'record'->>'retired_at')::timestamptz is distinct from place.retired_at
   or op<>'create' and ((after_value->'record')-array['label','class','aliases','ord','retired_at','seq','updated_at']) is distinct from
    ((before_value->'record')-array['label','class','aliases','ord','retired_at','seq','updated_at']) then raise exception 'place result changed' using errcode='40001';end if;
 end if;
 insert into ga_private.roadmap_shared_receipts(auth_user_id,request_id,target,expected_revision,change,applied_revision)
  values(actor,p_request_id,p_target,p_expected_revision,p_change,applied);
 if not found then raise exception 'shared receipt was not saved' using errcode='40001';end if;
 reply:=jsonb_build_object('protocol','roadmap.shared.v1','owner',actor,'request_id',p_request_id,'target',p_target,
  'expected_revision',p_expected_revision,'change',p_change,'status','saved','replayed',false,'applied_revision',applied,'current',after_value);
 return reply;
end $$;
revoke all on function ga_private.roadmap_shared_snapshot(jsonb,boolean),public.ga_roadmap_shared_read(jsonb),public.ga_roadmap_shared_write(jsonb,text,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.ga_roadmap_shared_read(jsonb),public.ga_roadmap_shared_write(jsonb,text,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
