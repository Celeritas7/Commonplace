-- REVIEW CANDIDATE ONLY. Requires 01/03/09 and matching staged client.
-- This additive API does not replace the legacy comparison importer.
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

-- Receipts also retain before/after preference history. They are not cached
-- authorization grants and never contain email or authentication tokens.
create table ga_private.roadmap_comparison_receipts (
 auth_user_id uuid not null,
 request_id uuid not null,
 comparison_id uuid not null,
 payload jsonb not null,
 before_edit jsonb not null,
 after_edit jsonb not null,
 created_at timestamptz not null default now(),
 primary key(auth_user_id,request_id),
 foreign key(comparison_id,auth_user_id) references public.roadmap_comparisons(id,user_id) on delete cascade
);
alter table ga_private.roadmap_comparison_receipts enable row level security;
revoke all on ga_private.roadmap_comparison_receipts from public,anon,authenticated,service_role;
create index on ga_private.roadmap_comparison_receipts(comparison_id,auth_user_id);

create function public.ga_roadmap_edit_comparison(p_comparison_id uuid,p_expected_updated_at timestamptz,
 p_patch jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); current_row public.roadmap_comparisons; old_row public.roadmap_comparisons;
 request jsonb; previous jsonb; replayed boolean; choice uuid; items jsonb;
begin
 perform from ga_private.roadmap_control where id and not paused for share;
 if not found then raise exception 'comparison access denied' using errcode='42501'; end if;
 perform from auth.users where id=actor and email_confirmed_at is not null and is_anonymous is false
  and coalesce(auth.jwt()->>'is_anonymous','false')='false' for share;
 if not found then raise exception 'comparison access denied' using errcode='42501'; end if;
 if p_comparison_id is null or p_request_id is null or p_expected_updated_at is null
  or not isfinite(p_expected_updated_at) or p_patch is null or jsonb_typeof(p_patch)<>'object'
  or p_patch='{}' or octet_length(p_patch::text)>8192 then
  raise exception 'invalid comparison edit' using errcode='22023';
 end if;
 if exists(select from jsonb_object_keys(p_patch) k where k not in ('weights','chosen_item')) then
  raise exception 'only weights and product choice may be edited' using errcode='22023';
 end if;
 if p_patch?'weights' then
  if jsonb_typeof(p_patch->'weights')<>'object' then raise exception 'invalid weights' using errcode='22023'; end if;
  if (select count(*) from jsonb_each(p_patch->'weights'))>64 then raise exception 'too many weights' using errcode='22023'; end if;
  if exists(select from jsonb_each(p_patch->'weights') w
   where length(w.key) not between 1 and 64 or jsonb_typeof(w.value)<>'number') then
   raise exception 'invalid weights' using errcode='22023';
  end if;
  if exists(select from jsonb_each(p_patch->'weights') w where w.value::numeric not between 0 and 3
   or w.value::numeric<>trunc(w.value::numeric)) then raise exception 'invalid weights' using errcode='22023'; end if;
 end if;
 if p_patch?'chosen_item' then
  if jsonb_typeof(p_patch->'chosen_item') not in ('null','string') then
   raise exception 'invalid product choice' using errcode='22023';
  end if;
  begin choice:=(p_patch->>'chosen_item')::uuid;
  exception when invalid_text_representation then raise exception 'invalid product choice' using errcode='22023'; end;
 end if;
 select * into current_row from public.roadmap_comparisons
  where id=p_comparison_id and user_id=actor for update;
 if not found then raise exception 'comparison access denied' using errcode='42501'; end if;
 request:=jsonb_build_object('comparison_id',p_comparison_id,
  'expected_updated_at',extract(epoch from p_expected_updated_at),'patch',p_patch);
 select payload into previous from ga_private.roadmap_comparison_receipts
  where auth_user_id=actor and request_id=p_request_id;
 replayed:=found;
 if replayed then
  if previous is distinct from request then raise exception 'request ID already used' using errcode='22023'; end if;
 else
  if current_row.updated_at is distinct from p_expected_updated_at then
   raise exception 'comparison changed; review current data' using errcode='40001';
  end if;
  if choice is not null then
   perform from public.roadmap_comparison_items where id=choice and comparison_id=p_comparison_id and user_id=actor for key share;
   if not found then raise exception 'product choice unavailable' using errcode='42501'; end if;
  end if;
  old_row:=current_row;
  update public.roadmap_comparisons set
   weights=case when p_patch?'weights' then p_patch->'weights' else weights end,
   chosen_item=case when p_patch?'chosen_item' then choice else chosen_item end
   where id=p_comparison_id and user_id=actor returning * into current_row;
  if not found or p_patch?'weights' and current_row.weights is distinct from p_patch->'weights'
   or p_patch?'chosen_item' and current_row.chosen_item is distinct from choice then
   raise exception 'comparison write not confirmed' using errcode='42501';
  end if;
  if current_row.updated_at=old_row.updated_at then
   raise exception 'comparison version did not advance; retry the original action' using errcode='40001';
  end if;
  insert into ga_private.roadmap_comparison_receipts(auth_user_id,request_id,comparison_id,payload,before_edit,after_edit)
   values(actor,p_request_id,p_comparison_id,request,
    jsonb_build_object('weights',old_row.weights,'chosen_item',old_row.chosen_item,'updated_at',old_row.updated_at),
    jsonb_build_object('weights',current_row.weights,'chosen_item',current_row.chosen_item,'updated_at',current_row.updated_at));
  if not found then raise exception 'comparison receipt not confirmed' using errcode='42501'; end if;
 end if;
 -- Return the currently owned comparison and its items, never an old replay
 -- snapshot that could overwrite a subsequent edit or reimport.
 select coalesce(jsonb_agg(to_jsonb(i)-'user_id' order by i.position,i.id),'[]') into items
  from public.roadmap_comparison_items i where i.comparison_id=p_comparison_id and i.user_id=actor;
 return jsonb_build_object('request_id',p_request_id,'replayed',replayed,
  'comparison',to_jsonb(current_row)-'user_id','items',items);
end $$;
revoke all on function public.ga_roadmap_edit_comparison(uuid,timestamptz,jsonb,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.ga_roadmap_edit_comparison(uuid,timestamptz,jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
