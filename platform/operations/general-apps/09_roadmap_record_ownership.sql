-- REVIEW CANDIDATE ONLY. Not an automatic Commonplace migration.
-- Requires candidates 01/03 and reviewed owning-app/recovery evidence.
-- No records are rewritten, reattributed or removed during installation.
begin;
set local search_path=pg_catalog,public;
set local lock_timeout='5s';
set local statement_timeout='60s';
lock table public.roadmap_tasks,
 public.roadmap_comparison_items,
 public.roadmap_comparisons,
 public.roadmap_contexts_map,
 public.roadmap_daily_logs,
 public.roadmap_projects,
 public.roadmap_role_locations,
 public.roadmap_roles,
 public.roadmap_suggestion_answers,
 public.roadmap_suggestions,
 public.roadmap_task_resources,
 public.roadmap_user_settings in access exclusive mode;
do $$
declare expected record; relation regclass; sequence_name regclass; privilege text; browser name;
begin
 if not exists(select from pg_constraint where conrelid='public.roadmap_tasks'::regclass
  and conname='ga_task_owner' and convalidated and pg_get_constraintdef(oid)='UNIQUE (id, user_id)')
  or not exists(select from pg_constraint where conrelid='public.roadmap_tasks'::regclass
   and conname='ga_parent_owner' and convalidated and pg_get_constraintdef(oid)=
   'FOREIGN KEY (parent_id, user_id) REFERENCES roadmap_tasks(id, user_id) ON DELETE CASCADE') then
  raise exception 'review candidate 03 task ownership prerequisite';
 end if;
 if not exists(select from pg_proc where oid=to_regprocedure('public.roadmap_save_comparison(jsonb)')
  and not prosecdef and pg_get_userbyid(proowner)='postgres' and prorettype='uuid'::regtype
  and proconfig=array['search_path=public']
  and md5(replace(prosrc,E'\r\n',E'\n'))='c97af579e4426bddda51449b3251027a')
  or not exists(select from pg_proc where oid=to_regprocedure('public.roadmap_set_updated_at()')
   and not prosecdef and pg_get_userbyid(proowner)='postgres' and prorettype='trigger'::regtype
   and md5(replace(prosrc,E'\r\n',E'\n'))='9b1889f56258bf9d6554213c05019c76') then
  raise exception 'review Roadmap comparison/timestamp function drift';
 end if;
 for expected in select * from (values
  ('roadmap_comparison_items','54d4f2d38ae629988167dd5d497ee964','ed406382c846791c85d72df89187729f','d41d8cd98f00b204e9800998ecf8427e'),
  ('roadmap_comparisons','23cf4cc592896be9cf6e2dbee91fecd0','2b029d0030c87d14881cf5e72574ce42','f5efbcc55954f28e1738bff0663ea610'),
  ('roadmap_contexts_map','36cdda469a1bf446b8a083ca22949ad6','b6c1c25099513e961bd03bbae9223984','d41d8cd98f00b204e9800998ecf8427e'),
  ('roadmap_daily_logs','526f5c0e42d4801502ad3886c5030261','445db7ae20cf40999212dbdbdb199aa0','d41d8cd98f00b204e9800998ecf8427e'),
  ('roadmap_projects','d31efaf7a17d9b1d6a38ef616246e021','37c7e1aef624335aeb7badeb1d29b5a0','99b96f8c986e69acf010c05c5b5fb672'),
  ('roadmap_role_locations','738367c7551adef8c774e1539afc0b1d','bf144f8a2b25e7771ab3a0433c13272a','d41d8cd98f00b204e9800998ecf8427e'),
  ('roadmap_roles','c1cc6d631eb1575c5db354779f7eaa17','7a46e12181d50f4f6973ade4305c2646','e1a11ba7fc3a39a9a799b08f0c5fb340'),
  ('roadmap_suggestion_answers','e97bf4bcd99712b857be4f3cba7b0845','1f0bff451b876cbb35e5eb283609c54c','d41d8cd98f00b204e9800998ecf8427e'),
  ('roadmap_suggestions','96815abf3a89c8c717c69c3c9a736dd2','48669088787f91d889489956fc96ea6d','d41d8cd98f00b204e9800998ecf8427e'),
  ('roadmap_task_resources','2ad4803976b1ea3cb31bc384b6073c8c','13cc17d742e43e0d5bbc555e1dd6ec16','d41d8cd98f00b204e9800998ecf8427e'),
  ('roadmap_user_settings','406dc0e7802199f570fe69c9be3d45e6','6612049f3686faf63bde4f80c441106b','1472d60cf869a4498b21c6c33ec6ed66')
 ) as source(tbl,columns_hash,constraints_hash,triggers_hash) loop
  relation:=format('public.%I',expected.tbl)::regclass;
  if not exists(select from pg_class where oid=relation and relkind='r' and relrowsecurity
   and pg_get_userbyid(relowner)='postgres')
   or (select md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull||':'||
    coalesce(pg_get_expr(d.adbin,d.adrelid),'')||':'||a.attidentity::text,E'\n' order by a.attnum))
    from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    where a.attrelid=relation and a.attnum>0 and not a.attisdropped) is distinct from expected.columns_hash
   or (select md5(string_agg(conname||':'||pg_get_constraintdef(oid)||':'||convalidated,E'\n' order by conname))
    from pg_constraint where conrelid=relation) is distinct from expected.constraints_hash
   or (select md5(coalesce(string_agg(tgname||':'||pg_get_triggerdef(oid)||':'||tgenabled::text,E'\n' order by tgname),''))
    from pg_trigger where tgrelid=relation and not tgisinternal) is distinct from expected.triggers_hash
   or (select count(*) from pg_policies where schemaname='public' and tablename=expected.tbl)<>1
   or not exists(select from pg_policies where schemaname='public' and tablename=expected.tbl
    and cmd='ALL' and roles='{authenticated}' and permissive='PERMISSIVE'
    and qual='(user_id = auth.uid())' and with_check=qual) then
   raise exception 'review Roadmap record baseline drift: %',relation;
  end if;
  perform ga_private.set_browser_access(relation,true);
 end loop;
 -- Preserve identity inserts, revoke sequence reset/read capabilities.
 sequence_name:=pg_get_serial_sequence('public.roadmap_suggestion_answers','id')::regclass;
 if sequence_name is null then raise exception 'review suggestion-answer identity sequence'; end if;
 execute format('revoke all on sequence %s from public,anon,authenticated',sequence_name);
 execute format('grant usage on sequence %s to authenticated',sequence_name);
 foreach browser in array array['anon','authenticated'] loop
  foreach privilege in array array['USAGE','SELECT','UPDATE'] loop
   if has_sequence_privilege(browser,sequence_name,privilege)<>(browser='authenticated' and privilege='USAGE')
    or has_sequence_privilege(browser,sequence_name,privilege||' WITH GRANT OPTION') then
    raise exception 'review effective Roadmap sequence privilege';
   end if;
  end loop;
 end loop;
 -- Keep the reviewed invoker RPC and current operators. No new definer API.
 revoke all on function public.roadmap_save_comparison(jsonb) from public,anon;
 if has_function_privilege('anon','public.roadmap_save_comparison(jsonb)','EXECUTE')
  or not has_function_privilege('authenticated','public.roadmap_save_comparison(jsonb)','EXECUTE')
  or has_function_privilege('authenticated','public.roadmap_save_comparison(jsonb)','EXECUTE WITH GRANT OPTION') then
  raise exception 'review inherited comparison execute privilege';
 end if;
end $$;

-- Replace each single-key link with its owner-qualified form, retaining its
-- constraint name and deletion behavior. Optional links null only the link,
-- never user_id. Validation stops and rolls back on any historical mismatch.
alter table public.roadmap_daily_logs drop constraint roadmap_daily_logs_task_id_fkey,
 add constraint roadmap_daily_logs_task_id_fkey foreign key(task_id,user_id) references public.roadmap_tasks(id,user_id) on delete SET NULL (task_id);
create index ga_daily_logs_task_owner on public.roadmap_daily_logs(task_id,user_id);
alter table public.roadmap_comparisons drop constraint roadmap_comparisons_task_id_fkey,
 add constraint roadmap_comparisons_task_id_fkey foreign key(task_id,user_id) references public.roadmap_tasks(id,user_id) on delete SET NULL (task_id);
create index ga_comparisons_task_owner on public.roadmap_comparisons(task_id,user_id);
alter table public.roadmap_suggestions drop constraint roadmap_suggestions_rm_task_id_fkey,
 add constraint roadmap_suggestions_rm_task_id_fkey foreign key(rm_task_id,user_id) references public.roadmap_tasks(id,user_id) on delete SET NULL (rm_task_id);
create index ga_suggestions_task_owner on public.roadmap_suggestions(rm_task_id,user_id);
alter table public.roadmap_task_resources drop constraint roadmap_task_resources_task_id_fkey,
 add constraint roadmap_task_resources_task_id_fkey foreign key(task_id,user_id) references public.roadmap_tasks(id,user_id) on delete CASCADE;
create index ga_task_resources_task_owner on public.roadmap_task_resources(task_id,user_id);

alter table public.roadmap_comparisons add constraint ga_comparison_owner unique(id,user_id);
alter table public.roadmap_comparison_items drop constraint roadmap_comparison_items_comparison_id_fkey,
 add constraint roadmap_comparison_items_comparison_id_fkey foreign key(comparison_id,user_id)
 references public.roadmap_comparisons(id,user_id) on delete cascade;
create index ga_comparison_items_parent_owner on public.roadmap_comparison_items(comparison_id,user_id);
alter table public.roadmap_comparison_items add constraint ga_comparison_item_membership unique(id,comparison_id,user_id);
alter table public.roadmap_comparisons add constraint ga_comparison_chosen_item
 foreign key(chosen_item,id,user_id) references public.roadmap_comparison_items(id,comparison_id,user_id)
 on delete set null (chosen_item);
create index ga_comparison_chosen_item on public.roadmap_comparisons(chosen_item,id,user_id)
 where chosen_item is not null;

-- The original composite SET NULL also nulled non-null user_id and refused
-- valid role deletion. Preserve the project and its owner, clearing only role_id.
alter table public.roadmap_projects drop constraint roadmap_projects_role_id_user_id_fkey,
 add constraint roadmap_projects_role_id_user_id_fkey foreign key(role_id,user_id)
 references public.roadmap_roles(id,user_id) on delete set null (role_id);
create index ga_project_role_owner on public.roadmap_projects(role_id,user_id);

-- suggestion_answers.suggestion_id is an external event reference: unknown or
-- expired suggestions are intentionally logged. It is NOT a parent key.
-- role_locations.location_id is a hub-owned logical place address. Retired
-- places retain their links. Neither address gains a guessed cross-app FK.
notify pgrst,'reload schema';
commit;
