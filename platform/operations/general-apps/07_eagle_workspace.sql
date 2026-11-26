-- REVIEW CANDIDATE ONLY. Not a migration or an approval to install.
-- Apply after revised 01/02 and reviewed Eagle/Logi client cutover evidence.
begin;
set local search_path=pg_catalog,public;
lock table ga_private.eagle_members,ga_private.client_cutovers,
 public.authentication_mode_user_roles in share mode;
lock table public.logi_projects,public.logi_assemblies,public.logi_versions,
 public.logi_nodes,public.logi_links,public.logi_revisions,
 public.eagle_units,public.eagle_unit_progress in access exclusive mode;
do $$
declare expected record; target regclass; browser name; privilege text;
begin
 if not exists(select from ga_private.client_cutovers where app='eagle'
  and evidence_ref like 'eagle-graph-v1:%' and verified_at<=now()) then
  raise exception 'reviewed Eagle graph/client cutover evidence required';
 end if;
 if not exists(select from pg_proc where oid='ga_private.linked_legacy_role()'::regprocedure
  and prosecdef and proconfig=array['search_path=""']
  and md5(replace(prosrc,chr(13),''))='2530f9031d27c2c2c7b607c3bc7aa463') then
  raise exception 'review verified Eagle role helper';
 end if;
 if not exists(select from pg_proc where oid='ga_private.set_browser_access(regclass,boolean)'::regprocedure
  and not prosecdef and proconfig=array['search_path=""']
  and md5(replace(prosrc,chr(13),''))='711eb18ae3b913ba0b2ff7af68216137') then
  raise exception 'review browser privilege installer';
 end if;
 if not exists(select from ga_private.eagle_members m
  join public.authentication_mode_user_roles r using(auth_user_id)
  join auth.users u on u.id=m.auth_user_id where u.email_confirmed_at is not null
  and u.is_anonymous is false and r.role in ('admin','operator')) then
  raise exception 'verified Eagle writer required';
 end if;
 for expected in select * from (values
  ('logi_projects','859cb47e5c8706e08d386526c7e37042','2935628a8581d58103a79892ca12def4'),
  ('logi_assemblies','9e7e45f617f8cf6e1efa52381fb1b1ae','ef48185ed42f7495603b21749585b35b'),
  ('logi_versions','d0f56ff4afc8e9f20651d0edf57c8f53','19ebaf8abb3c4a4e74e7dbf663fa6c7c'),
  ('logi_nodes','f82eaca1c0b1cdd0df27606890d69a5a','ac2e1de6966b2930534dd6dfed9e2774'),
  ('logi_links','adf115f344edbf25686b19c2ae5f9695','7650839ae72f8bc0ded3dc11ec28fa6a'),
  ('logi_revisions','21541f68d5443cc9599fdbb0e5d79e32','33cf94cff080131503c6fa0cb3097ae0'),
  ('eagle_units','c8d58fd7af83c1485b3716984221b401','ef752b8684971a52916667d508e170d2'),
  ('eagle_unit_progress','e856e9cb255d151e65eb04bf304d246a','823ba73fc83f4e833aec836bd5034b63')
 ) s(tbl,columns_hash,constraints_hash) loop
  target:=format('public.%I',expected.tbl)::regclass;
  if not exists(select from pg_class where oid=target and relkind='r' and relrowsecurity)
   or (select md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull::text||':'||
    coalesce(pg_get_expr(d.adbin,d.adrelid),''),'|' order by a.attnum))
    from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    where a.attrelid=target and a.attnum>0 and not a.attisdropped)<>expected.columns_hash
   or (select md5(string_agg(conname||':'||pg_get_constraintdef(oid)||':'||convalidated::text,'|' order by conname))
    from pg_constraint where conrelid=target)<>expected.constraints_hash then
   raise exception 'review Eagle graph shape: %',target;
  end if;
  -- Parent reads/writes retain their policies. Remove bypass privileges, including
  -- TRUNCATE (which does not run row triggers), without granting new CRUD rights.
  execute format('revoke truncate,references,trigger on %s from public,anon,authenticated',target);
  if current_setting('server_version_num')::int>=170000 then
   execute format('revoke maintain on %s from public,anon,authenticated',target);
  end if;
  foreach browser in array array['anon','authenticated'] loop
   if exists(select from pg_roles r,pg_class c where r.rolname=browser and c.oid=target
    and (r.rolsuper or r.rolbypassrls or pg_has_role(r.oid,c.relowner,'USAGE'))) then
    raise exception 'browser bypass on %',target;
   end if;
   foreach privilege in array case when current_setting('server_version_num')::int>=170000
    then array['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] else array['TRUNCATE','REFERENCES','TRIGGER'] end loop
    if has_table_privilege(browser,target,privilege) then raise exception 'inherited bypass on %',target; end if;
   end loop;
  end loop;
 end loop;
 for expected in select * from (values
  ('eagle_units','81c27faa4442d382e34454baeda4f197'),
  ('eagle_unit_progress','96b972e0b6763808e09a8026b33f86cd')) t(tbl,policy_hash) loop
  if (select md5(string_agg(policyname||':'||permissive||':'||roles::text||':'||cmd||':'||
   coalesce(qual,'')||':'||coalesce(with_check,''),'|' order by policyname))
   from pg_policies where schemaname='public' and tablename=expected.tbl) is distinct from expected.policy_hash then
   raise exception 'review Eagle role policies';
  end if;
  perform ga_private.set_browser_access(format('public.%I',expected.tbl)::regclass,true);
 end loop;
 -- Pin the registry write policy and its verified UUID role helper. Read-only
 -- policies may evolve independently; any extra browser-write policy blocks us.
 if not exists(select from pg_class where oid='authentication_mode_user_roles'::regclass and relrowsecurity)
 or (select count(*) from pg_policies where schemaname='public'
  and tablename='authentication_mode_user_roles' and cmd<>'SELECT')<>1
 or not exists(select from pg_policies where schemaname='public'
  and tablename='authentication_mode_user_roles' and policyname='chatak_roles_admin_write'
  and cmd='ALL' and permissive='PERMISSIVE' and roles=array['public']::name[]
  and qual='(chatak_role() = ''admin''::text)' and with_check='(chatak_role() = ''admin''::text)')
 or not exists(select from pg_proc where oid='public.chatak_role()'::regprocedure and prosecdef
  and proconfig=array['search_path=""'] and md5(replace(prosrc,chr(13),''))='7d739fd228bb5b5001cf32da0d7c2c40') then
  raise exception 'review shared role administration';
 end if;
 revoke truncate,references,trigger on public.authentication_mode_user_roles from public,anon,authenticated;
 if current_setting('server_version_num')::int>=170000 then
  revoke maintain on public.authentication_mode_user_roles from public,anon,authenticated;
 end if;
 foreach browser in array array['anon','authenticated'] loop
  foreach privilege in array case when current_setting('server_version_num')::int>=170000
    then array['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] else array['TRUNCATE','REFERENCES','TRIGGER'] end loop
   if has_table_privilege(browser,'public.authentication_mode_user_roles',privilege) then
    raise exception 'inherited registry bypass';
   end if;
  end loop;
 end loop;
 if exists(select from pg_trigger where not tgisinternal and tgrelid in
  ('logi_projects'::regclass,'logi_assemblies'::regclass,'logi_versions'::regclass,
   'logi_nodes'::regclass,'logi_links'::regclass,'logi_revisions'::regclass)) then
  raise exception 'review Logi trigger dependencies';
 end if;
 if (select count(*) from pg_trigger where not tgisinternal and tgrelid in
  ('eagle_units'::regclass,'eagle_unit_progress'::regclass))<>3
  or not exists(select from pg_trigger where tgrelid='eagle_unit_progress'::regclass
   and tgname='eagle_unit_progress_updated_at' and tgfoid='eagle_set_updated_at()'::regprocedure
   and tgtype=19 and tgenabled='O')
  or not exists(select from pg_proc where oid='eagle_set_updated_at()'::regprocedure
   and not prosecdef and md5(replace(prosrc,chr(13),''))='301a884953d37769916294bb60562e05') then
  raise exception 'review Eagle trigger baseline';
 end if;
 if exists(select from pg_constraint where contype='f' and confrelid in
  ('logi_projects'::regclass,'logi_assemblies'::regclass,'logi_versions'::regclass,
   'logi_nodes'::regclass,'logi_links'::regclass,'eagle_units'::regclass,'eagle_unit_progress'::regclass)
  and conrelid not in ('logi_projects'::regclass,'logi_assemblies'::regclass,'logi_versions'::regclass,
   'logi_nodes'::regclass,'logi_links'::regclass,'logi_revisions'::regclass,'eagle_units'::regclass,'eagle_unit_progress'::regclass)) then
  raise exception 'review additional Eagle graph consumers';
 end if;
end $$;
-- An actual row update serializes graph mutations, including writers that cannot
-- see Eagle rows through RLS. Under REPEATABLE READ a stale writer aborts instead
-- of accepting a stale graph. Keep the singleton private; absence fails closed.
create table ga_private.eagle_graph_serial (singleton boolean primary key check(singleton),revision bigint not null);
insert into ga_private.eagle_graph_serial values(true,0);
alter table ga_private.eagle_graph_serial enable row level security;
revoke all on ga_private.eagle_graph_serial from public,anon,authenticated,service_role;

create function ga_private.require_eagle_writer() returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from ga_private.eagle_members m
 join public.authentication_mode_user_roles r using(auth_user_id)
 join auth.users u on u.id=m.auth_user_id
 where m.auth_user_id=auth.uid() and r.role in ('admin','operator')
  and u.email_confirmed_at is not null and u.is_anonymous is false
  and coalesce(auth.jwt()->>'is_anonymous','false')='false'
 for share of m,r,u;
 if not found then raise exception 'Eagle writer required' using errcode='42501'; end if;
end; $$;

create function ga_private.guard_eagle_graph() returns trigger
language plpgsql security definer set search_path='' as $$
declare previous jsonb:=case when tg_op<>'INSERT' then to_jsonb(old) else '{}'::jsonb end;
 upcoming jsonb:=case when tg_op<>'DELETE' then to_jsonb(new) else '{}'::jsonb end;
 ids uuid[]:=array[(previous->>'id')::uuid,(upcoming->>'id')::uuid];
 assemblies uuid[]:=array[(previous->>'assembly_id')::uuid,(upcoming->>'assembly_id')::uuid];
 protected boolean:=false;
begin
 if tg_table_schema<>'public' or tg_table_name not in ('eagle_units','eagle_unit_progress',
  'logi_projects','logi_assemblies','logi_versions','logi_nodes','logi_links','logi_revisions') then
  raise exception 'unexpected Eagle guard binding';
 end if;
 update ga_private.eagle_graph_serial set revision=revision+1 where singleton;
 if not found then raise exception 'Eagle graph serialization unavailable' using errcode='42501'; end if;
 case tg_table_name
 when 'eagle_units','eagle_unit_progress' then protected:=true;
 when 'logi_projects' then
  select exists(select from public.eagle_units u join public.logi_assemblies a on a.id=u.assembly_id
   where a.project_id=any(ids)) into protected;
 when 'logi_assemblies' then
  select exists(select from public.eagle_units where assembly_id=any(ids)) into protected;
 when 'logi_nodes' then
  select exists(select from public.eagle_units where assembly_id=any(assemblies))
   or exists(select from public.eagle_unit_progress where node_id=any(ids)) into protected;
 when 'logi_links' then
  select exists(select from public.eagle_units where assembly_id=any(assemblies))
   or exists(select from public.logi_nodes n join public.eagle_units u on u.assembly_id=n.assembly_id
    where n.id=any(array[(previous->>'parent_id')::uuid,(upcoming->>'parent_id')::uuid,
     (previous->>'child_id')::uuid,(upcoming->>'child_id')::uuid])) into protected;
 else -- Versions and saved revisions of an Eagle assembly.
  select exists(select from public.eagle_units where assembly_id=any(assemblies)) into protected;
 end case;
 if protected then perform ga_private.require_eagle_writer(); end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end; $$;

-- Validate the final graph, not intermediate CASCADE ordering. Optional legacy
-- versions stay optional. No source row is repaired, recast or deleted here.
create function ga_private.validate_eagle_graph() returns void
language plpgsql security definer set search_path='' as $$
begin
 if exists(select from public.eagle_units u join public.logi_versions v on v.id=u.version_id
  where v.assembly_id is distinct from u.assembly_id)
 or exists(select from public.eagle_unit_progress p
  join public.eagle_units u on u.id=p.unit_id join public.logi_nodes n on n.id=p.node_id
  left join public.logi_versions v on v.id=n.version_id
  where n.assembly_id is distinct from u.assembly_id
   or (n.version_id is not null and v.assembly_id is distinct from n.assembly_id)
   or (u.version_id is not null and n.version_id is not null and u.version_id<>n.version_id)) then
  raise exception 'Eagle unit, node and version must belong to the same assembly' using errcode='23514';
 end if;
end; $$;
create function ga_private.check_eagle_graph() returns trigger
language plpgsql security definer set search_path='' as $$
begin perform ga_private.validate_eagle_graph(); return null; end; $$;
select ga_private.validate_eagle_graph();
do $$ declare target regclass;
begin
 foreach target in array array['public.eagle_units'::regclass,'public.eagle_unit_progress'::regclass,
  'public.logi_projects'::regclass,'public.logi_assemblies'::regclass,'public.logi_versions'::regclass,
  'public.logi_nodes'::regclass,'public.logi_links'::regclass,'public.logi_revisions'::regclass] loop
  execute format('create trigger ga_eagle_graph_guard before insert or update or delete on %s
   for each row execute function ga_private.guard_eagle_graph()',target);
  execute format('create constraint trigger ga_eagle_graph_check after insert or update or delete on %s
   deferrable initially deferred for each row execute function ga_private.check_eagle_graph()',target);
 end loop;
end $$;
revoke all on function ga_private.require_eagle_writer(),ga_private.guard_eagle_graph(),
 ga_private.validate_eagle_graph(),ga_private.check_eagle_graph() from public,anon,authenticated,service_role;
-- Only the invoker RPC needs this checked, no-argument function. It returns no
-- membership details and cannot grant access or mutate business data.
grant execute on function ga_private.require_eagle_writer() to authenticated;

-- Replaces the parent's multi-request deletion in a separately reviewed staging
-- client. Invoker security preserves parent ACL/RLS. One transaction removes
-- units before nodes (the progress-to-node FK is NO ACTION). ALL changes roll
-- back if a parent/child refuses deletion; no FK is weakened or made cascading.
create function public.ga_eagle_delete_assembly(target_id uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare removed uuid;
begin
 perform ga_private.require_eagle_writer();
 delete from public.eagle_units where assembly_id=target_id;
 delete from public.logi_assemblies where id=target_id returning id into removed;
 if removed is null then raise exception 'assembly unavailable' using errcode='42501'; end if;
 return removed;
end; $$;
create function public.ga_eagle_delete_project(target_id uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare removed uuid;
begin
 perform ga_private.require_eagle_writer();
 delete from public.eagle_units where assembly_id in
  (select id from public.logi_assemblies where project_id=target_id);
 delete from public.logi_projects where id=target_id returning id into removed;
 if removed is null then raise exception 'project unavailable' using errcode='42501'; end if;
 return removed;
end; $$;
revoke all on function public.ga_eagle_delete_assembly(uuid),public.ga_eagle_delete_project(uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.ga_eagle_delete_assembly(uuid),public.ga_eagle_delete_project(uuid) to authenticated;
create function public.ga_eagle_archive_node(target_id uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare changed uuid;
begin
 perform ga_private.require_eagle_writer();
 delete from public.logi_links where parent_id=target_id or child_id=target_id;
 update public.logi_nodes set deleted=true where id=target_id returning id into changed;
 if changed is null then raise exception 'node unavailable' using errcode='42501'; end if;
 return changed;
end; $$;
revoke all on function public.ga_eagle_archive_node(uuid) from public,anon,authenticated,service_role;
grant execute on function public.ga_eagle_archive_node(uuid) to authenticated;
create function public.ga_eagle_workspace_role() returns text
language sql stable security invoker set search_path='' as $$
 select ga_private.linked_legacy_role();
$$;
revoke all on function public.ga_eagle_workspace_role() from public,anon,authenticated,service_role;
grant execute on function public.ga_eagle_workspace_role() to authenticated;
notify pgrst,'reload schema';
commit;
