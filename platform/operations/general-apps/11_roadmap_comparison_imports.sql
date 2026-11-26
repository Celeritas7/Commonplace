-- REVIEW CANDIDATE ONLY. Requires 01/03/09/10 and explicit owning-caller cutover.
-- Additive import contract; legacy SQL-console/import callers stay unchanged.
begin;
set local search_path=pg_catalog,public;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.roadmap_comparisons,public.roadmap_comparison_items in access exclusive mode;
lock table ga_private.roadmap_control in share mode;
do $$
declare expected record;
begin
 if not exists(select from ga_private.roadmap_control where id and not paused) then
  raise exception 'review active Roadmap action control';
 end if;
 for expected in select * from (values
  ('roadmap_comparisons','23cf4cc592896be9cf6e2dbee91fecd0'),
  ('roadmap_comparison_items','54d4f2d38ae629988167dd5d497ee964')
 ) t(tbl,column_hash) loop
  if not exists(select from pg_class where oid=format('public.%I',expected.tbl)::regclass
    and relkind='r' and relrowsecurity and pg_get_userbyid(relowner)='postgres')
   or (select md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||
    coalesce(pg_get_expr(d.adbin,d.adrelid),'')||':'||a.attidentity::text,E'\n' order by a.attnum))
    from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    where a.attrelid=format('public.%I',expected.tbl)::regclass and a.attnum>0 and not a.attisdropped)
     is distinct from expected.column_hash
   or (select count(*) from pg_policies where schemaname='public' and tablename=expected.tbl)<>1
   or not exists(select from pg_policies where schemaname='public' and tablename=expected.tbl
    and cmd='ALL' and roles='{authenticated}' and permissive='PERMISSIVE'
    and qual='(user_id = auth.uid())' and with_check=qual) then
   raise exception 'review Roadmap comparison baseline';
  end if;
 end loop;
 for expected in select * from (values
  ('roadmap_comparisons','ga_comparison_owner','UNIQUE (id, user_id)'),
  ('roadmap_comparison_items','roadmap_comparison_items_comparison_id_fkey',
   'FOREIGN KEY (comparison_id, user_id) REFERENCES roadmap_comparisons(id, user_id) ON DELETE CASCADE'),
  ('roadmap_comparison_items','ga_comparison_item_membership','UNIQUE (id, comparison_id, user_id)'),
  ('roadmap_comparisons','ga_comparison_chosen_item',
   'FOREIGN KEY (chosen_item, id, user_id) REFERENCES roadmap_comparison_items(id, comparison_id, user_id) ON DELETE SET NULL (chosen_item)')
 ) t(tbl,name,definition) loop
  if not exists(select from pg_constraint where conrelid=format('public.%I',expected.tbl)::regclass
   and conname=expected.name and convalidated and pg_get_constraintdef(oid)=expected.definition) then
   raise exception 'review candidate 09 comparison membership constraints';
  end if;
 end loop;
 if (select count(*) from pg_trigger where not tgisinternal and tgrelid in
   ('roadmap_comparisons'::regclass,'roadmap_comparison_items'::regclass))<>1
  or not exists(select from pg_trigger where tgrelid='roadmap_comparisons'::regclass
   and tgname='roadmap_comparisons_updated_at' and tgfoid='roadmap_set_updated_at()'::regprocedure and tgtype=19 and tgenabled='O')
  or not exists(select from pg_proc where oid='roadmap_set_updated_at()'::regprocedure and not prosecdef
   and pg_get_userbyid(proowner)='postgres' and md5(replace(prosrc,chr(13),''))='9b1889f56258bf9d6554213c05019c76') then
  raise exception 'review comparison timestamp contract';
 end if;
end $$;

do $$ begin
 if not exists(select from pg_proc where oid=to_regprocedure('public.ga_roadmap_edit_comparison(uuid,timestamptz,jsonb,uuid)')
  and prosecdef and pg_get_userbyid(proowner)='postgres' and md5(replace(prosrc,chr(13),''))='36201a22aaf8a60e1c5a9853f7e6e486')
  or not exists(select from pg_constraint where conrelid='public.roadmap_comparisons'::regclass
   and conname='roadmap_comparisons_task_id_fkey' and convalidated
   and pg_get_constraintdef(oid)='FOREIGN KEY (task_id, user_id) REFERENCES roadmap_tasks(id, user_id) ON DELETE SET NULL (task_id)') then
  raise exception 'review candidate 09/10 import dependencies';
 end if;
end $$;

-- Keep full before/after history even if a legacy caller later deletes a study.
-- A missing/deleted target cannot be recreated by retrying its old request.
create table ga_private.roadmap_import_receipts (
 auth_user_id uuid not null, request_id uuid not null, comparison_id uuid not null,
 payload jsonb not null, before_state jsonb, after_state jsonb not null,
 created_at timestamptz not null default now(), primary key(auth_user_id,request_id)
);
alter table ga_private.roadmap_import_receipts enable row level security;
revoke all on ga_private.roadmap_import_receipts from public,anon,authenticated,service_role;
create index on ga_private.roadmap_import_receipts(comparison_id,auth_user_id);

-- Parent lock also fences new child FK insertions. Existing children are locked
-- in stable order before hashing, so direct legacy item edits cannot be missed.
create function ga_private.roadmap_import_state(target uuid,actor uuid) returns jsonb
language plpgsql set search_path='' set timezone='UTC' as $$
declare c public.roadmap_comparisons; products jsonb; state jsonb;
begin
 select * into c from public.roadmap_comparisons where id=target and user_id=actor for update;
 if not found then raise exception 'comparison import access denied' using errcode='42501'; end if;
 perform from public.roadmap_comparison_items where comparison_id=target order by id for update;
 select coalesce(jsonb_agg(to_jsonb(i)-'user_id' order by i.position,i.id),'[]') into products
  from public.roadmap_comparison_items i where comparison_id=target and user_id=actor;
 state:=jsonb_build_object('comparison',to_jsonb(c)-'user_id','items',products);
 return state||jsonb_build_object('revision',encode(sha256(convert_to(state::text,'UTF8')),'hex'));
end $$;
revoke all on function ga_private.roadmap_import_state(uuid,uuid) from public,anon,authenticated,service_role;

create function public.ga_roadmap_preview_import(p_comparison_id uuid) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=auth.uid();
begin
 perform from ga_private.roadmap_control where id and not paused for share;
 if not found then raise exception 'comparison import access denied' using errcode='42501'; end if;
 perform from auth.users where id=actor and email_confirmed_at is not null and is_anonymous is false
  and coalesce(auth.jwt()->>'is_anonymous','false')='false' for share;
 if not found then raise exception 'comparison import access denied' using errcode='42501'; end if;
 return ga_private.roadmap_import_state(p_comparison_id,actor);
end $$;
revoke all on function public.ga_roadmap_preview_import(uuid) from public,anon,authenticated,service_role;
grant execute on function public.ga_roadmap_preview_import(uuid) to authenticated;

create function public.ga_roadmap_import_comparison(p_comparison_id uuid,p_task_id uuid,
 p_expected_revision text,p_document jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare actor uuid:=auth.uid(); prior ga_private.roadmap_import_receipts; replayed boolean;
 request jsonb; before_state jsonb; after_state jsonb; current_row public.roadmap_comparisons;
 desired public.roadmap_comparison_items; written public.roadmap_comparison_items;
 it jsonb; field record; product uuid; ids uuid[]:='{}'; item_position integer:=0;
 removed integer; affected integer; was_existing boolean; original_choice uuid;
begin
 perform from ga_private.roadmap_control where id and not paused for share;
 if not found then raise exception 'comparison import access denied' using errcode='42501'; end if;
 perform from auth.users where id=actor and email_confirmed_at is not null and is_anonymous is false
  and coalesce(auth.jwt()->>'is_anonymous','false')='false' for share;
 if not found then raise exception 'comparison import access denied' using errcode='42501'; end if;
 if p_comparison_id is null or p_request_id is null or p_document is null or jsonb_typeof(p_document)<>'object'
  or octet_length(p_document::text)>262144
  or p_expected_revision is not null and p_expected_revision!~'^[0-9a-f]{64}$' then
  raise exception 'invalid comparison import' using errcode='22023';
 end if;
 if exists(select from jsonb_object_keys(p_document) k where k not in ('title','need','source','notes','items','clear_missing_choice'))
  or jsonb_typeof(p_document->'title') is distinct from 'string'
  or length(trim(p_document->>'title')) not between 1 and 500 then
  raise exception 'invalid import fields or title' using errcode='22023';
 end if;
 for field in select key,value from jsonb_each(p_document) where key in ('need','source','notes') loop
  if jsonb_typeof(field.value) not in ('null','string') or length(field.value#>>'{}')>20000 then
   raise exception 'invalid import text' using errcode='22023';
  end if;
 end loop;
 if p_document?'clear_missing_choice' and jsonb_typeof(p_document->'clear_missing_choice')<>'boolean'
  or jsonb_typeof(p_document->'items') is distinct from 'array' then
  raise exception 'invalid import products' using errcode='22023';
 end if;
 if jsonb_array_length(p_document->'items') not between 1 and 100 then
  raise exception 'import requires 1 to 100 products' using errcode='22023';
 end if;
 for it in select value from jsonb_array_elements(p_document->'items') loop
  if jsonb_typeof(it)<>'object' then raise exception 'invalid product' using errcode='22023'; end if;
  if exists(select from jsonb_object_keys(it) k where k not in ('id','name','brand','model','image_url','url','shop',
   'price','currency','quality','life_years','warranty_months','size','rating','review_count','pros','cons','extra','notes'))
   or jsonb_typeof(it->'id') is distinct from 'string' or jsonb_typeof(it->'name') is distinct from 'string'
   or length(trim(it->>'name')) not between 1 and 500 then
   raise exception 'invalid product fields' using errcode='22023';
  end if;
  begin product:=(it->>'id')::uuid;
  exception when invalid_text_representation then raise exception 'invalid product ID' using errcode='22023'; end;
  if product=any(ids) then raise exception 'duplicate product ID' using errcode='22023'; end if;
  ids:=array_append(ids,product);
  for field in select key,value from jsonb_each(it) where key not in ('id','name') loop
   if field.key in ('price','quality','life_years','warranty_months','rating','review_count') then
    if jsonb_typeof(field.value)<>'null' then
     if jsonb_typeof(field.value)<>'number' then raise exception 'invalid product number' using errcode='22023'; end if;
     if field.value::numeric<0 or field.value::numeric>1000000000000
      or field.key in ('quality','rating') and field.value::numeric>5
      or field.key in ('warranty_months','review_count') and
       (field.value::numeric<>trunc(field.value::numeric) or field.value::numeric>2147483647) then
      raise exception 'invalid product number' using errcode='22023';
     end if;
    end if;
   elsif field.key in ('pros','cons') then
    if jsonb_typeof(field.value)<>'array' then raise exception 'invalid product list' using errcode='22023'; end if;
    if jsonb_array_length(field.value)>64 or exists(select from jsonb_array_elements(field.value) v
     where jsonb_typeof(v)<>'string' or length(v#>>'{}')>2000) then
     raise exception 'invalid product list' using errcode='22023';
    end if;
   elsif field.key='extra' then
    if jsonb_typeof(field.value)<>'object' then raise exception 'invalid extra data' using errcode='22023'; end if;
    if (select count(*) from jsonb_each(field.value))>64 or exists(select from jsonb_each(field.value) e
     where length(e.key) not between 1 and 64 or jsonb_typeof(e.value) in ('array','object') or length(e.value::text)>2000) then
     raise exception 'invalid extra data' using errcode='22023';
    end if;
   else
    if jsonb_typeof(field.value) not in ('null','string') or length(field.value#>>'{}')>20000
     or field.key='currency' and (jsonb_typeof(field.value)<>'string' or field.value#>>'{}'!~'^[A-Z]{3}$') then
     raise exception 'invalid product text' using errcode='22023';
    end if;
    if field.key in ('image_url','url') and jsonb_typeof(field.value)<>'null'
     and (length(field.value#>>'{}')>2048 or field.value#>>'{}'!~'^https?://[^[:space:]]+$') then
     raise exception 'only HTTP(S) product links are accepted' using errcode='22023';
    end if;
   end if;
  end loop;
 end loop;
 -- Serialize this owner's import requests, including first creation and request
 -- identity reuse across different comparison IDs. No title-based discovery.
 perform pg_advisory_xact_lock(hashtextextended(actor::text,11011));
 request:=jsonb_build_object('comparison_id',p_comparison_id,'task_id',p_task_id,
  'expected_revision',p_expected_revision,'document',p_document);
 select * into prior from ga_private.roadmap_import_receipts where auth_user_id=actor and request_id=p_request_id;
 replayed:=found;
 if replayed then
  if prior.payload is distinct from request then raise exception 'request ID already used' using errcode='22023'; end if;
  after_state:=ga_private.roadmap_import_state(p_comparison_id,actor);
  return after_state||jsonb_build_object('request_id',p_request_id,'replayed',true);
 end if;
 select * into current_row from public.roadmap_comparisons where id=p_comparison_id for update;
 was_existing:=found;
 if was_existing then
  if current_row.user_id<>actor then raise exception 'comparison import access denied' using errcode='42501'; end if;
  before_state:=ga_private.roadmap_import_state(p_comparison_id,actor);
  if p_expected_revision is null or p_expected_revision is distinct from before_state->>'revision' then
   raise exception 'comparison changed; review import again' using errcode='40001';
  end if;
  if p_task_id is distinct from current_row.task_id then raise exception 'import cannot move a comparison' using errcode='22023'; end if;
  original_choice:=current_row.chosen_item;
  if original_choice is not null and not original_choice=any(ids)
   and coalesce((p_document->>'clear_missing_choice')::boolean,false) is false then
   raise exception 'review removal of the chosen product explicitly' using errcode='22023';
  end if;
 else
  if p_expected_revision is not null then raise exception 'comparison import access denied' using errcode='42501'; end if;
  perform from public.roadmap_tasks where id=p_task_id and user_id=actor and kind='task' for key share;
  if not found then raise exception 'explicit owned task required' using errcode='42501'; end if;
  insert into public.roadmap_comparisons(id,user_id,task_id,title) values(p_comparison_id,actor,p_task_id,p_document->>'title')
   returning * into current_row;
  if not found then raise exception 'comparison creation not confirmed' using errcode='42501'; end if;
 end if;
 -- Validate and lock referenced product identities before replacing anything.
 perform from public.roadmap_comparison_items where id=any(ids) order by id for update;
 if exists(select from public.roadmap_comparison_items where id=any(ids)
  and (comparison_id<>p_comparison_id or user_id<>actor)) then
  raise exception 'product belongs to another comparison' using errcode='42501';
 end if;
 update public.roadmap_comparisons set title=p_document->>'title',
  need=case when p_document?'need' then p_document->>'need' else need end,
  source=case when p_document?'source' then p_document->>'source' else source end,
  notes=case when p_document?'notes' then p_document->>'notes' else notes end,
  chosen_item=case when chosen_item=any(ids) then chosen_item else null end
  where id=p_comparison_id and user_id=actor returning * into current_row;
 if not found or current_row.title is distinct from p_document->>'title'
  or p_document?'notes' and current_row.notes is distinct from p_document->>'notes'
  or p_document?'need' and current_row.need is distinct from p_document->>'need'
  or p_document?'source' and current_row.source is distinct from p_document->>'source'
  or was_existing and current_row.weights is distinct from before_state->'comparison'->'weights'
  or current_row.chosen_item is distinct from (case when original_choice=any(ids) then original_choice else null end) then
  raise exception 'comparison write not confirmed' using errcode='42501';
 end if;
 select count(*) into removed from public.roadmap_comparison_items where comparison_id=p_comparison_id and not id=any(ids);
 delete from public.roadmap_comparison_items where comparison_id=p_comparison_id and not id=any(ids);
 get diagnostics affected=row_count;
 if affected<>removed then raise exception 'product replacement not confirmed' using errcode='42501'; end if;
 for it in select value from jsonb_array_elements(p_document->'items') loop
  select * into desired from public.roadmap_comparison_items where id=(it->>'id')::uuid;
  if not found then
   desired:=jsonb_populate_record(null::public.roadmap_comparison_items,jsonb_build_object('id',(it->>'id')::uuid,
    'user_id',actor,'comparison_id',p_comparison_id,'currency','JPY','pros','[]'::jsonb,'cons','[]'::jsonb,
    'extra','{}'::jsonb,'created_at',now()));
  end if;
  desired:=jsonb_populate_record(desired,it||jsonb_build_object('position',item_position));
  insert into public.roadmap_comparison_items select (desired).*
   on conflict(id) do update set name=excluded.name,brand=excluded.brand,model=excluded.model,
    image_url=excluded.image_url,url=excluded.url,shop=excluded.shop,price=excluded.price,currency=excluded.currency,
    quality=excluded.quality,life_years=excluded.life_years,warranty_months=excluded.warranty_months,size=excluded.size,
    rating=excluded.rating,review_count=excluded.review_count,pros=excluded.pros,cons=excluded.cons,
    extra=excluded.extra,notes=excluded.notes,position=excluded.position
   returning * into written;
  if not found or to_jsonb(written) is distinct from to_jsonb(desired) then
   raise exception 'product write not confirmed' using errcode='42501';
  end if;
  item_position:=item_position+1;
 end loop;
 after_state:=ga_private.roadmap_import_state(p_comparison_id,actor);
 insert into ga_private.roadmap_import_receipts(auth_user_id,request_id,comparison_id,payload,before_state,after_state)
  values(actor,p_request_id,p_comparison_id,request,before_state,after_state);
 if not found then raise exception 'import history not confirmed' using errcode='42501'; end if;
 return after_state||jsonb_build_object('request_id',p_request_id,'replayed',false);
end $$;
revoke all on function public.ga_roadmap_import_comparison(uuid,uuid,text,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.ga_roadmap_import_comparison(uuid,uuid,text,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
