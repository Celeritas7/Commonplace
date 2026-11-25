-- REVIEW CANDIDATE ONLY. Apply only after the owning clients are ready.
begin;
set local search_path=pg_catalog,public;
lock table ga_private.owner_links,ga_private.client_cutovers,ga_private.eagle_members,
 public.authentication_mode_user_roles in share mode;
lock table public.code_sensei_users,public.code_sensei_user_notes,public.code_sensei_progress,
 public.healthlog_visits_old,public.eagle_units,public.eagle_unit_progress in access exclusive mode;
do $$
declare target record; relation regclass; browser name; privilege text;
begin
 if exists(select app from (values ('code-sensei'),('healthlog-archive'),('eagle')) required(app)
  except select app from ga_private.client_cutovers where verified_at<=now()) then
  raise exception 'affected client cutover evidence required';
 end if;
 if exists(select from public.code_sensei_users u where not exists(
   select from ga_private.owner_links l where l.app='code-sensei' and l.code_user_id=u.id))
  or exists(select from public.code_sensei_user_notes n left join public.code_sensei_users u on u.id=n.user_id where u.id is null)
  or exists(select from public.code_sensei_progress p left join public.code_sensei_users u on u.id=p.user_id where u.id is null)
  or exists(select from public.healthlog_visits_old v where not exists(
   select from ga_private.owner_links l where l.app='healthlog-archive' and l.legacy_id=v.user_id))
  or exists(select from ga_private.owner_links l where l.app='healthlog-archive' and not exists(
   select from public.healthlog_visits_old v where v.user_id=l.legacy_id)) then
  raise exception 'verified owner mapping required; existing data was not changed';
 end if;
 if exists(select from ga_private.owner_links l join auth.users u on u.id=l.auth_user_id
  where u.email_confirmed_at is null) then raise exception 'mapped Auth identity must be verified'; end if;
 if not exists(select from ga_private.eagle_members m join public.authentication_mode_user_roles r using(auth_user_id)
  join auth.users u on u.id=m.auth_user_id where u.email_confirmed_at is not null and r.role in ('operator','admin')) then
  raise exception 'verified Eagle writer required';
 end if;
 if not exists(select from pg_constraint where conrelid='public.eagle_unit_progress'::regclass and
  confrelid='public.eagle_units'::regclass and convalidated and contype='f' and
  pg_get_constraintdef(oid)='FOREIGN KEY (unit_id) REFERENCES eagle_units(id) ON DELETE CASCADE') then
  raise exception 'review Eagle unit/progress relationship';
 end if;
 for target in select * from (values
  ('code_sensei_users','allow_all','public'),('code_sensei_user_notes','allow_all','public'),
  ('code_sensei_progress','allow_all','public'),('healthlog_visits_old','all visits','public'),
  ('eagle_units','eagle_units_authenticated_all','authenticated'),
  ('eagle_unit_progress','eagle_unit_progress_authenticated_all','authenticated')) as t(tbl,policy,member)
 loop
  relation:=format('public.%I',target.tbl)::regclass;
  if not exists(select from pg_class where oid=relation and relkind='r' and relrowsecurity)
   or (select count(*) from pg_policies where schemaname='public' and tablename=target.tbl)<>1
   or not exists(select from pg_policies where schemaname='public' and tablename=target.tbl
     and policyname=target.policy and roles=array[target.member]::name[] and permissive='PERMISSIVE'
     and cmd='ALL' and qual='true' and with_check='true') then
   raise exception 'review effective policy baseline for %',relation;
  end if;
  foreach browser in array array['anon','authenticated'] loop
   foreach privilege in array array['SELECT','INSERT','UPDATE','DELETE'] loop
    if not has_table_privilege(browser,relation,privilege) then
     raise exception 'review browser grant baseline for %',relation;
    end if;
   end loop;
  end loop;
  perform ga_private.set_browser_access(relation,target.tbl<>'code_sensei_users');
  execute format('create policy ga_authenticated_guard on %s as restrictive for all to public
   using(auth.uid() is not null) with check(auth.uid() is not null)',relation);
 end loop;
end $$;
create policy ga_owner_guard on public.code_sensei_users as restrictive for all
 to authenticated using(ga_private.owns_legacy('code-sensei',id::text))
 with check(ga_private.owns_legacy('code-sensei',id::text));
create policy ga_owner_guard on public.code_sensei_user_notes as restrictive for all
 to authenticated using(ga_private.owns_legacy('code-sensei',user_id::text))
 with check(ga_private.owns_legacy('code-sensei',user_id::text));
create policy ga_owner_guard on public.code_sensei_progress as restrictive for all
 to authenticated using(ga_private.owns_legacy('code-sensei',user_id::text))
 with check(ga_private.owns_legacy('code-sensei',user_id::text));
create policy ga_owner_guard on public.healthlog_visits_old as restrictive for all
 to authenticated using(ga_private.owns_legacy('healthlog-archive',user_id))
 with check(ga_private.owns_legacy('healthlog-archive',user_id));
-- An archive visit retains its original owner key even when two keys have
-- legitimately been mapped to the same person.
create function ga_private.keep_archive_key() returns trigger language plpgsql set search_path='' as $$
begin
 raise exception 'archive owner key cannot be changed' using errcode='42501';
end; $$;
create trigger keep_archive_key before update on public.healthlog_visits_old
 for each row when (old.user_id is distinct from new.user_id) execute function ga_private.keep_archive_key();

-- Unit and progress share membership and write roles. Cascades from Logi can
-- bypass RLS, so check the initiating identity on actual unit updates/deletes.
do $$
declare target regclass;
begin
 foreach target in array array['public.eagle_units'::regclass,'public.eagle_unit_progress'::regclass] loop
  execute format('create policy ga_read_guard on %s as restrictive for select to authenticated
   using ((select ga_private.linked_legacy_role()) in (''admin'',''operator'',''viewer''))',target);
  execute format('create policy ga_insert_guard on %s as restrictive for insert to authenticated
   with check ((select ga_private.linked_legacy_role()) in (''admin'',''operator''))',target);
  execute format('create policy ga_update_guard on %s as restrictive for update to authenticated
   using ((select ga_private.linked_legacy_role()) in (''admin'',''operator''))
   with check ((select ga_private.linked_legacy_role()) in (''admin'',''operator''))',target);
  execute format('create policy ga_delete_guard on %s as restrictive for delete to authenticated
   using ((select ga_private.linked_legacy_role()) in (''admin'',''operator''))',target);
 end loop;
end $$;
create function ga_private.check_eagle_writer() returns trigger language plpgsql set search_path='' as $$
begin
 if coalesce(ga_private.linked_legacy_role() in ('admin','operator'),false) then
  if tg_op='DELETE' then return old; end if;
  return new;
 end if;
 raise exception 'Eagle writer required' using errcode='42501';
end; $$;
create trigger check_eagle_writer before update or delete on public.eagle_units
 for each row execute function ga_private.check_eagle_writer();
create trigger check_eagle_writer before update or delete on public.eagle_unit_progress
 for each row execute function ga_private.check_eagle_writer();
revoke all on function ga_private.keep_archive_key(),ga_private.check_eagle_writer()
 from public,anon,authenticated,service_role;
commit;
